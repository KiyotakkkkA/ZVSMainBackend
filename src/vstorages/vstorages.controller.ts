import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import type { AuthenticatedRequest } from 'src/auth/jwt.guard';
import { AuthGuard } from 'src/auth/jwt.guard';
import { Roles } from 'src/auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';
import { VerificationGuard } from 'src/auth/verification.guard';
import { CreateEmbeddingsDto } from 'src/dto/vstorages/create-embeddings.dto';
import { CreateVstorageDto } from 'src/dto/vstorages/create-vstorage.dto';
import { CreateVstorageTagDto } from 'src/dto/vstorages/create-vstorage-tag.dto';
import { ListVstoragesQueryDto } from 'src/dto/vstorages/list-vstorages-query.dto';
import { SearchEmbeddingsDto } from 'src/dto/vstorages/search-embeddings.dto';
import { UpdateVstorageDto } from 'src/dto/vstorages/update-vstorage.dto';
import { VstoragesService } from './vstorages.service';

@Controller('vstorages')
@Roles(Role.USER)
@UseGuards(AuthGuard, VerificationGuard, RolesGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class VstoragesController {
  constructor(private readonly vstoragesService: VstoragesService) {}

  private resolveAccessToken(request: AuthenticatedRequest): string {
    const authorization = request.headers.authorization ?? '';

    return authorization.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length).trim()
      : '';
  }

  private requireAccessToken(request: AuthenticatedRequest): string {
    const accessToken = this.resolveAccessToken(request);

    if (!accessToken) {
      throw new UnauthorizedException('Access token is missing');
    }

    return accessToken;
  }

  @Get()
  async list(
    @Query() query: ListVstoragesQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.vstoragesService.list(Number(request.user.sub), query);
  }

  @Post()
  async create(
    @Body() body: CreateVstorageDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const accessToken = this.requireAccessToken(request);

    return this.vstoragesService.create(
      Number(request.user.sub),
      body,
      accessToken,
    );
  }

  @Post(':id/search')
  async searchEmbeddings(
    @Param('id') id: string,
    @Body() body: SearchEmbeddingsDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const accessToken = this.requireAccessToken(request);

    return this.vstoragesService.search(
      Number(request.user.sub),
      id,
      accessToken,
      body,
    );
  }

  @UseInterceptors(AnyFilesInterceptor())
  @Post(':id/embeddings')
  async uploadEmbeddings(
    @Param('id') id: string,
    @Body() body: CreateEmbeddingsDto,
    @Req() request: AuthenticatedRequest,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const accessToken = this.requireAccessToken(request);

    return this.vstoragesService.proxyEmbeddings(
      Number(request.user.sub),
      id,
      accessToken,
      files,
      body.collectionName,
      body.source,
      body.documentSources,
    );
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateVstorageDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.vstoragesService.update(Number(request.user.sub), id, body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    const accessToken = this.requireAccessToken(request);

    return this.vstoragesService.delete(
      Number(request.user.sub),
      id,
      accessToken,
    );
  }

  @Get('tags')
  async listTags(@Req() request: AuthenticatedRequest) {
    return this.vstoragesService.listTags(Number(request.user.sub));
  }

  @Post('tags')
  async createTag(
    @Body() body: CreateVstorageTagDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.vstoragesService.createTag(Number(request.user.sub), body);
  }
}
