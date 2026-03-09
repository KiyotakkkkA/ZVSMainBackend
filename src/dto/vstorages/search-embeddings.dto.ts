import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class SearchEmbeddingsDto {
  @IsString()
  @MaxLength(2000)
  query: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  topK: number;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  collectionName?: string;
}
