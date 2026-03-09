import { Controller, Get } from '@nestjs/common';
import { createHash, createPublicKey } from 'crypto';
import { ConfigService } from 'src/config/config.service';

@Controller('.well-known')
export class JwksController {
  private readonly jwks: { keys: object[] };

  constructor(private readonly configService: ConfigService) {
    const publicKeyPem = this.configService.getJwtPublicKey();
    const publicKey = createPublicKey(publicKeyPem);
    const jwk = publicKey.export({ format: 'jwk' });

    const kid = createHash('sha256')
      .update(publicKeyPem)
      .digest('base64url')
      .slice(0, 16);

    this.jwks = {
      keys: [
        {
          ...jwk,
          alg: 'RS256',
          use: 'sig',
          kid,
        },
      ],
    };
  }

  @Get('jwks.json')
  getJwks() {
    return this.jwks;
  }
}
