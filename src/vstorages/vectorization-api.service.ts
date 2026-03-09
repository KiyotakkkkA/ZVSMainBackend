import {
  BadGatewayException,
  BadRequestException,
  GatewayTimeoutException,
  HttpException,
  Inject,
  Injectable,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
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

type SearchEmbeddingsRequest = {
  access_token: string;
  vstore_uuid: string;
  query: string;
  top_k: number;
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

type SearchResultItem = {
  id: string;
  document: string;
  metadata_json: string;
  distance: number;
};

type SearchEmbeddingsResponse = {
  success: boolean;
  message?: string;
  items: SearchResultItem[];
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
  SearchEmbeddings(
    data: SearchEmbeddingsRequest,
  ): import('rxjs').Observable<SearchEmbeddingsResponse>;
};

const errors = {
  '4': {
    error_class: GatewayTimeoutException,
    default_message: 'Запрос сервису превысил время ожидания',
  },
  '8': {
    error_class: BadRequestException,
    default_message: 'Документ который вы пытаетесь отправить слишком велик.',
  },
  '14': {
    error_class: ServiceUnavailableException,
    default_message: 'Сервис недоступен',
  },
};

@Injectable()
export class VectorizationApiService implements OnModuleInit {
  private vectorizationService!: VectorizationGrpcService;

  constructor(
    @Inject(VECTORIZATION_GRPC_CLIENT)
    private readonly grpcClient: unknown,
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

  async searchEmbeddings(
    storageId: string,
    accessToken: string,
    query: string,
    topK: number,
    collectionName?: string,
  ): Promise<SearchEmbeddingsResponse> {
    const response = await this.callGrpc(() =>
      this.vectorizationService.SearchEmbeddings({
        access_token: accessToken,
        vstore_uuid: storageId,
        query,
        top_k: topK,
        collection_name: collectionName ?? '',
      }),
    );

    return {
      success: response.success,
      message: response.message,
      items: response.items ?? [],
      error: response.error,
    };
  }

  private async callGrpc<T>(
    handler: () => import('rxjs').Observable<T>,
  ): Promise<T> {
    try {
      return await firstValueFrom(handler());
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      const grpcError = error as {
        code?: number;
        details?: string;
        message?: string;
      };

      const errorInfo = grpcError.code
        ? errors[grpcError.code.toString()]
        : null;

      if (errorInfo) {
        const { error_class: ErrorClass, default_message } = errorInfo;
        throw new ErrorClass(default_message);
      }

      throw new BadGatewayException(
        grpcError.details ??
          grpcError.message ??
          'Ошибка при взаимодействии с сервисом',
      );
    }
  }
}
