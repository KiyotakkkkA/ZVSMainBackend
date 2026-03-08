import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigService {
  getJwtSecret(): string {
    return this.getString('JWT_SECRET', 'dev_jwt_secret_change_me');
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
