import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class UserLogoutDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  public refreshToken: string;
}
