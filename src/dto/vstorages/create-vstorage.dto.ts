import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateVstorageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}
