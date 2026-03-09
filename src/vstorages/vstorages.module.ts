import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AuthModule } from 'src/auth/auth.module';
import { ConfigModule } from 'src/config/config.module';
import { ConfigService } from 'src/config/config.service';
import { DatabaseModule } from 'src/database/database.module';
import { VECTORIZATION_GRPC_CLIENT } from './vstorages.tokens';
import { VstoragesService } from './vstorages.service';
import { VstoragesController } from './vstorages.controller';
import { VectorizationApiService } from './vectorization-api.service';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    ConfigModule,
    ClientsModule.registerAsync([
      {
        name: VECTORIZATION_GRPC_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'vectorization',
            protoPath: join(process.cwd(), 'proto', 'vectorization.proto'),
            url: configService.getVectorizationGrpcUrl(),
            loader: {
              keepCase: true,
            },
            channelOptions: {
              'grpc.max_send_message_length':
                configService.getVectorizationGrpcMaxSendMessageBytes(),
              'grpc.max_receive_message_length':
                configService.getVectorizationGrpcMaxReceiveMessageBytes(),
            },
          },
        }),
      },
    ]),
  ],
  providers: [VstoragesService, VectorizationApiService],
  controllers: [VstoragesController],
})
export class VstoragesModule {}
