import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { DatabaseModule } from 'src/database/database.module';
import { VstoragesService } from './vstorages.service';
import { VstoragesController } from './vstorages.controller';
import { VectorizationApiService } from './vectorization-api.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  providers: [VstoragesService, VectorizationApiService],
  controllers: [VstoragesController],
})
export class VstoragesModule {}
