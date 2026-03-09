import {
  BadRequestException,
  Inject,
  Injectable,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { ConfigService } from 'src/config/config.service';
import { VECTORIZATION_GRPC_CLIENT } from './vstorages.tokens';

type CreateVstoreRequest = {
  access_token: string;
};

type DeleteVstoreRequest = {
  access_token: string;
  vstore_uuid: string;
};

type EmbedDocument = {
  name: string;
  source: string;
  content: Buffer;
  storage_file_id: string;
};

type CreateEmbeddingsRequest = {
  access_token: string;
  vstore_uuid: string;
  documents: EmbedDocument[];
  collection_name: string;
};

type VstoreOperationPayload = {
  vstore_uuid?: string;
  collection?: string;
  path?: string;
};

type VstoreOperationResponse = {
  success: boolean;
  message?: string;
  payload?: VstoreOperationPayload;
};

type CreateEmbeddingsResponse = {
  success: boolean;
  directory_size: string | number;
  vectorized_chunks: number;
  error?: string;
};

type VectorizationGrpcService = {
  CreateVstore(
    data: CreateVstoreRequest,
  ): import('rxjs').Observable<VstoreOperationResponse>;
  DeleteVstore(
    data: DeleteVstoreRequest,
  ): import('rxjs').Observable<VstoreOperationResponse>;
  CreateEmbeddings(
    data: CreateEmbeddingsRequest,
  ): import('rxjs').Observable<CreateEmbeddingsResponse>;
};

@Injectable()
export class VectorizationApiService implements OnModuleInit {
  private vectorizationService!: VectorizationGrpcService;

  constructor(
    @Inject(VECTORIZATION_GRPC_CLIENT)
    private readonly grpcClient: unknown,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    const grpcClient = this.grpcClient as ClientGrpc;

    this.vectorizationService = grpcClient.getService<VectorizationGrpcService>(
      'VectorizationService',
    );
  }

  async createStorage(accessToken: string): Promise<string> {
    const response = await this.callGrpc(() =>
      this.vectorizationService.CreateVstore({
        access_token: accessToken,
      }),
    );

    if (!response.success) {
      throw new BadRequestException(
        response.message ?? 'Vectorization service failed to create storage',
      );
    }

    const storageId = response.payload?.vstore_uuid?.trim();
    if (!storageId) {
      throw new BadRequestException(
        'Vectorization service did not return storage UUID',
      );
    }

    return storageId;
  }

  async deleteStorage(storageId: string, accessToken: string): Promise<void> {
    const response = await this.callGrpc(() =>
      this.vectorizationService.DeleteVstore({
        access_token: accessToken,
        vstore_uuid: storageId,
      }),
    );

    if (!response.success) {
      throw new BadRequestException(
        response.message ?? 'Vectorization service failed to delete storage',
      );
    }
  }

  async createEmbeddings(
    storageId: string,
    accessToken: string,
    documents: EmbedDocument[],
    collectionName?: string,
  ): Promise<{
    success: boolean;
    directorySize: number;
    vectorizedChunks: number;
    error?: string;
  }> {
    const response = await this.callGrpc(() =>
      this.vectorizationService.CreateEmbeddings({
        access_token: accessToken,
        vstore_uuid: storageId,
        documents,
        collection_name: collectionName ?? '',
      }),
    );

    return {
      success: response.success,
      directorySize: Number(response.directory_size ?? 0),
      vectorizedChunks: response.vectorized_chunks,
      error: response.error,
    };
  }

  private async callGrpc<T>(
    handler: () => import('rxjs').Observable<T>,
  ): Promise<T> {
    try {
      return await firstValueFrom(
        handler().pipe(
          timeout(this.configService.getVectorizationApiTimeoutMs()),
        ),
      );
    } catch {
      throw new ServiceUnavailableException(
        'Vectorization gRPC service is unavailable',
      );
    }
  }
}
