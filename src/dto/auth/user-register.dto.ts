import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class UserRegisterDto {
  @IsEmail()
  @IsNotEmpty()
  public email: string;

  @IsString()
  @MinLength(6)
  public password: string;

  @IsString()
  @MinLength(6)
  public passwordConfirm: string;
}
