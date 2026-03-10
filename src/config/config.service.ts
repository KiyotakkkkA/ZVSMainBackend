import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { CONFIG_ERRORS, configError } from './config.errors';

@Injectable()
export class ConfigService {
  private readonly jwtPrivateKey: string;
  private readonly jwtPublicKey: string;
  private readonly jwtKid: string;

  constructor() {
    const keysDir = join(process.cwd(), 'keys');
    this.jwtPrivateKey = readFileSync(join(keysDir, 'private.pem'), 'utf-8');
    this.jwtPublicKey = readFileSync(join(keysDir, 'public.pem'), 'utf-8');
    this.jwtKid = createHash('sha256')
      .update(this.jwtPublicKey)
      .digest('base64url')
      .slice(0, 16);
  }

  getJwtPrivateKey(): string {
    return this.jwtPrivateKey;
  }

  getJwtPublicKey(): string {
    return this.jwtPublicKey;
  }

  getJwtKid(): string {
    return this.jwtKid;
  }

  getJwtAccessExpiresInSeconds(): number {
    return this.getNumber('JWT_ACCESS_EXPIRES_IN_SECONDS', 900);
  }

  getJwtRefreshTtlDays(): number {
    return this.getNumber('JWT_REFRESH_TTL_DAYS', 7);
  }

  getMailHost(): string {
    return this.getString('MAIL_HOST');
  }

  getMailPort(): number {
    return this.getNumber('MAIL_PORT', 587);
  }

  getMailSecure(): boolean {
    const value = (process.env.MAIL_SECURE ?? 'false').toLowerCase().trim();

    return value === '1' || value === 'true';
  }

  getMailUser(): string {
    return this.getString('MAIL_USER');
  }

  getMailPassword(): string {
    return this.getString('MAIL_PASSWORD');
  }

  getMailFrom(): string {
    return this.getString('MAIL_FROM', this.getMailUser());
  }

  getMailAppName(): string {
    return this.getString('MAIL_APP_NAME', 'ZVS');
  }

  getDatabaseUrl(): string {
    return this.getString('DATABASE_URL');
  }

  getVectorizationGrpcUrl(): string {
    return this.getString('SERVICE_VECTORIZATION_GRPC_URL', '127.0.0.1:50051');
  }

  getVectorizationGrpcEmbeddingsBatchBytes(): number {
    return this.getNumber(
      'SERVICE_VECTORIZATION_GRPC_EMBEDDINGS_BATCH_BYTES',
      50 * 1024 * 1024,
    );
  }

  getVectorizationGrpcMaxSendMessageBytes(): number {
    return this.getNumber(
      'SERVICE_VECTORIZATION_GRPC_MAX_SEND_MESSAGE_BYTES',
      70 * 1024 * 1024,
    );
  }

  getVectorizationGrpcMaxReceiveMessageBytes(): number {
    return this.getNumber(
      'SERVICE_VECTORIZATION_GRPC_MAX_RECEIVE_MESSAGE_BYTES',
      70 * 1024 * 1024,
    );
  }

  private getString(name: string, defaultValue?: string): string {
    const value = process.env[name] ?? defaultValue;

    if (!value) {
      throw new Error(configError(CONFIG_ERRORS.MISSING_ENV_VAR, name));
    }

    return value;
  }

  private getNumber(name: string, defaultValue: number): number {
    const value = process.env[name];

    if (!value) {
      return defaultValue;
    }

    const parsed = Number(value);

    if (Number.isNaN(parsed)) {
      throw new Error(configError(CONFIG_ERRORS.ENV_VAR_MUST_BE_NUMBER, name));
    }

    return parsed;
  }
}
