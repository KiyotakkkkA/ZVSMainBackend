import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class UserLoginDto {
  @IsEmail()
  @IsNotEmpty()
  public email: string;

  @IsString()
  @MinLength(6)
  public password: string;
}
