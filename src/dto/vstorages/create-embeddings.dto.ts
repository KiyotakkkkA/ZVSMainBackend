import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateEmbeddingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  collectionName?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documentSources?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documents?: string[];
}
