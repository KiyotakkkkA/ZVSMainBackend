import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from 'src/config/config.service';
import { DatabaseService } from 'src/database/database.service';
import { CreateVstorageDto } from 'src/dto/vstorages/create-vstorage.dto';
import { CreateVstorageTagDto } from 'src/dto/vstorages/create-vstorage-tag.dto';
import { ListVstoragesQueryDto } from 'src/dto/vstorages/list-vstorages-query.dto';
import { SearchEmbeddingsDto } from 'src/dto/vstorages/search-embeddings.dto';
import { UpdateVstorageDto } from 'src/dto/vstorages/update-vstorage.dto';
import { VectorizationApiService } from './vectorization-api.service';
import {
  VSTORAGES_ERRORS,
  vstoragesError,
  vstoragesFileTooLargeError,
} from './vstorages.errors';

@Injectable()
export class VstoragesService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
    private readonly vectorizationApiService: VectorizationApiService,
  ) {}

  async list(userId: number, query: ListVstoragesQueryDto) {
    const name = query.name?.trim();
    const tagIds = query.tagIds?.filter(Boolean) ?? [];

    const storages = await this.databaseService.vectorStorage.findMany({
      where: {
        userId,
        ...(name ? { name: { contains: name, mode: 'insensitive' } } : {}),
        ...(tagIds.length > 0
          ? { tags: { some: { id: { in: tagIds } } } }
          : {}),
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        lastActiveAt: true,
        size: true,
        tags: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      storages: storages.map((storage) => ({
        id: storage.id,
        name: storage.name,
        createdAt: storage.createdAt.toISOString(),
        lastActiveAt: storage.lastActiveAt.toISOString(),
        size: storage.size,
        tags: storage.tags.map((tag) => ({
          id: tag.id,
          name: tag.name,
        })),
      })),
    };
  }

  async create(userId: number, body: CreateVstorageDto, accessToken: string) {
    const storageId =
      await this.vectorizationApiService.createStorage(accessToken);

    let created: {
      id: string;
      name: string;
      createdAt: Date;
      lastActiveAt: Date;
      size: number;
      tags: Array<{ id: string; name: string }>;
    };

    try {
      created = await this.databaseService.vectorStorage.create({
        data: {
          id: storageId,
          userId,
          name: body.name.trim(),
        },
        select: {
          id: true,
          name: true,
          createdAt: true,
          lastActiveAt: true,
          size: true,
          tags: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    } catch {
      await this.vectorizationApiService
        .deleteStorage(storageId, accessToken)
        .catch(() => undefined);

      throw new InternalServerErrorException(
        vstoragesError(VSTORAGES_ERRORS.PERSIST_METADATA_FAILED),
      );
    }

    return {
      id: created.id,
      name: created.name,
      createdAt: created.createdAt.toISOString(),
      lastActiveAt: created.lastActiveAt.toISOString(),
      size: created.size,
      tags: created.tags.map((tag: { id: string; name: string }) => ({
        id: tag.id,
        name: tag.name,
      })),
    };
  }

  async search(
    userId: number,
    id: string,
    accessToken: string,
    body: SearchEmbeddingsDto,
  ): Promise<{
    success: boolean;
    message?: string;
    items: Array<{
      id: string;
      document: string;
      metadata_json: string;
      distance: number;
    }>;
    error?: string;
  }> {
    const storage = await this.databaseService.vectorStorage.findFirst({
      where: {
        id,
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!storage) {
      throw new NotFoundException(
        vstoragesError(VSTORAGES_ERRORS.STORAGE_NOT_FOUND),
      );
    }

    return this.vectorizationApiService.searchEmbeddings(
      id,
      accessToken,
      body.query,
      body.topK,
      body.collectionName,
    );
  }

  async proxyEmbeddings(
    userId: number,
    id: string,
    accessToken: string,
    files: Express.Multer.File[],
    collectionName?: string,
    source?: string,
    documentSources?: string[],
  ): Promise<{
    success: boolean;
    directorySize: number;
    vectorizedChunks: number;
    error?: string;
  }> {
    if (!files.length) {
      throw new BadRequestException(
        vstoragesError(VSTORAGES_ERRORS.FILE_REQUIRED),
      );
    }

    const storage = await this.databaseService.vectorStorage.findFirst({
      where: {
        id,
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!storage) {
      throw new NotFoundException(
        vstoragesError(VSTORAGES_ERRORS.STORAGE_NOT_FOUND),
      );
    }

    const documents = files.map((file, index) => ({
      name: file.originalname,
      source: documentSources?.[index] ?? source ?? 'upload',
      content: file.buffer,
      storage_file_id: '',
    }));

    const maxBatchBytes =
      this.configService.getVectorizationGrpcEmbeddingsBatchBytes();

    const batches: (typeof documents)[] = [];
    let currentBatch: typeof documents = [];
    let currentBatchSize = 0;

    for (const document of documents) {
      const documentSize = document.content.byteLength;

      if (documentSize > maxBatchBytes) {
        throw new BadRequestException(
          vstoragesFileTooLargeError(document.name, maxBatchBytes),
        );
      }

      if (
        currentBatch.length > 0 &&
        currentBatchSize + documentSize > maxBatchBytes
      ) {
        batches.push(currentBatch);
        currentBatch = [];
        currentBatchSize = 0;
      }

      currentBatch.push(document);
      currentBatchSize += documentSize;
    }

    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    let lastDirectorySize = 0;
    let totalVectorizedChunks = 0;

    for (const batch of batches) {
      const result = await this.vectorizationApiService.createEmbeddings(
        id,
        accessToken,
        batch,
        collectionName,
      );

      if (!result.success) {
        return result;
      }

      lastDirectorySize = result.directorySize;
      totalVectorizedChunks += result.vectorizedChunks;
    }

    return {
      success: true,
      directorySize: lastDirectorySize,
      vectorizedChunks: totalVectorizedChunks,
    };
  }

  async update(userId: number, id: string, body: UpdateVstorageDto) {
    const existing = await this.databaseService.vectorStorage.findFirst({
      where: {
        id,
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw new NotFoundException(
        vstoragesError(VSTORAGES_ERRORS.STORAGE_NOT_FOUND),
      );
    }

    const tags = await this.databaseService.vectorStorageTag.findMany({
      where: {
        userId,
        id: {
          in: body.tagIds,
        },
      },
      select: {
        id: true,
      },
    });

    const updated = await this.databaseService.vectorStorage.update({
      where: {
        id,
      },
      data: {
        name: body.name.trim(),
        tags: {
          set: tags.map((tag) => ({ id: tag.id })),
        },
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        lastActiveAt: true,
        size: true,
        tags: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      createdAt: updated.createdAt.toISOString(),
      lastActiveAt: updated.lastActiveAt.toISOString(),
      size: updated.size,
      tags: updated.tags.map((tag: { id: string; name: string }) => ({
        id: tag.id,
        name: tag.name,
      })),
    };
  }

  async delete(userId: number, id: string, accessToken: string) {
    const existing = await this.databaseService.vectorStorage.findFirst({
      where: {
        id,
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw new NotFoundException(
        vstoragesError(VSTORAGES_ERRORS.STORAGE_NOT_FOUND),
      );
    }

    await this.vectorizationApiService.deleteStorage(id, accessToken);

    await this.databaseService.vectorStorage.delete({
      where: {
        id,
      },
    });

    return;
  }

  async listTags(userId: number) {
    const tags = await this.databaseService.vectorStorageTag.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return {
      tags,
    };
  }

  async createTag(
    userId: number,
    body: CreateVstorageTagDto,
  ): Promise<{ id: string; name: string }> {
    try {
      const created = await this.databaseService.vectorStorageTag.create({
        data: {
          userId,
          name: body.name.trim(),
        },
        select: {
          id: true,
          name: true,
        },
      });

      return {
        id: created.id,
        name: created.name,
      };
    } catch {
      throw new BadRequestException(
        vstoragesError(VSTORAGES_ERRORS.TAG_ALREADY_EXISTS),
      );
    }
  }
}
