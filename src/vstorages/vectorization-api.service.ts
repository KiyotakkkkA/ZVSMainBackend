import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from 'src/config/config.service';

type VectorizationPayload = {
  vstore_uuid?: string;
} | null;

type VectorizationResponse = {
  success: boolean;
  message?: string;
  payload?: VectorizationPayload;
};

@Injectable()
export class VectorizationApiService {
  constructor(private readonly configService: ConfigService) {}

  async createStorage(accessToken: string): Promise<string> {
    const result = await this.request('/vstorages/create', {
      method: 'POST',
      accessToken,
    });

    const storageId = result.payload?.vstore_uuid?.trim();
    if (!storageId) {
      throw new BadRequestException(
        'Vectorization service did not return storage UUID',
      );
    }

    return storageId;
  }

  async deleteStorage(storageId: string, accessToken: string): Promise<void> {
    await this.request(`/vstorages/delete/${encodeURIComponent(storageId)}`, {
      method: 'DELETE',
      accessToken,
    });
  }

  private async request(
    endpoint: string,
    options: { method: 'POST' | 'DELETE'; accessToken: string },
  ): Promise<VectorizationResponse> {
    const baseUrl = this.configService.getVectorizationApiUrl();
    const timeoutMs = this.configService.getVectorizationApiTimeoutMs();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;

    try {
      response = await fetch(`${baseUrl}${endpoint}`, {
        method: options.method,
        headers: {
          Authorization: `Bearer ${options.accessToken}`,
          ...(options.method === 'POST'
            ? { 'Content-Type': 'application/json' }
            : {}),
        },
        signal: controller.signal,
      });
    } catch {
      throw new ServiceUnavailableException(
        'Vectorization service is unavailable',
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      throw new BadRequestException(
        `Vectorization service request failed: ${response.status} ${response.statusText}`,
      );
    }

    let payload: VectorizationResponse;

    try {
      payload = (await response.json()) as VectorizationResponse;
    } catch {
      throw new BadRequestException(
        'Vectorization service returned invalid JSON response',
      );
    }

    if (!payload.success) {
      throw new BadRequestException(
        payload.message ?? 'Vectorization service rejected request',
      );
    }

    return payload;
  }
}
