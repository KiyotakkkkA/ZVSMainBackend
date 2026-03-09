import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';

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

  getDatabaseUrl(): string {
    return this.getString('DATABASE_URL');
  }

  getVectorizationApiUrl(): string {
    return this.getString('SERVICE_VECTORIZATION_API_URL');
  }

  getVectorizationApiTimeoutMs(): number {
    return this.getNumber('SERVICE_VECTORIZATION_API_TIMEOUT_MS', 10000);
  }

  getVectorizationGrpcUrl(): string {
    return this.getString('SERVICE_VECTORIZATION_GRPC_URL', '127.0.0.1:50051');
  }

  private getString(name: string, defaultValue?: string): string {
    const value = process.env[name] ?? defaultValue;

    if (!value) {
      throw new Error(`Missing environment variable: ${name}`);
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
      throw new Error(`Environment variable ${name} must be a number`);
    }

    return parsed;
  }
}
