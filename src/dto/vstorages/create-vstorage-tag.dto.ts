import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateVstorageTagDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name: string;
}
