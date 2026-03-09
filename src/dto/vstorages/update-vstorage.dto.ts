import { IsArray, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateVstorageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsArray()
  @IsString({ each: true })
  tagIds: string[];
}
