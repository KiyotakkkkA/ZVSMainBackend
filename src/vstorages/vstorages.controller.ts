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
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { AuthenticatedRequest } from 'src/auth/auth.guard';
import { AuthGuard } from 'src/auth/auth.guard';
import { CreateVstorageDto } from 'src/dto/vstorages/create-vstorage.dto';
import { CreateVstorageTagDto } from 'src/dto/vstorages/create-vstorage-tag.dto';
import { ListVstoragesQueryDto } from 'src/dto/vstorages/list-vstorages-query.dto';
import { UpdateVstorageDto } from 'src/dto/vstorages/update-vstorage.dto';
import { VstoragesService } from './vstorages.service';

@Controller('vstorages')
@UseGuards(AuthGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class VstoragesController {
  constructor(private readonly vstoragesService: VstoragesService) {}

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
    const authorization = request.headers.authorization ?? '';
    const accessToken = authorization.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length).trim()
      : '';

    return this.vstoragesService.create(
      Number(request.user.sub),
      body,
      accessToken,
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
    const authorization = request.headers.authorization ?? '';
    const accessToken = authorization.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length).trim()
      : '';

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
