import { Controller, Get } from '@nestjs/common';
import { createPublicKey } from 'crypto';
import { ConfigService } from 'src/config/config.service';

@Controller('.well-known')
export class JwksController {
  private readonly jwks: { keys: object[] };

  constructor(private readonly configService: ConfigService) {
    const publicKeyPem = this.configService.getJwtPublicKey();
    const publicKey = createPublicKey(publicKeyPem);
    const jwk = publicKey.export({ format: 'jwk' });

    this.jwks = {
      keys: [
        {
          ...jwk,
          alg: 'RS256',
          use: 'sig',
          kid: this.configService.getJwtKid(),
        },
      ],
    };
  }

  @Get('jwks.json')
  getJwks() {
    return this.jwks;
  }
}
