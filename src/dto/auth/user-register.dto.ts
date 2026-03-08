export class UserRegisterDto {
  public email: string;
  public password: string;
  public passwordConfirm: string;

  constructor(email: string, password: string, passwordConfirm: string) {
    this.email = email;
    this.password = password;
    this.passwordConfirm = passwordConfirm;
  }
}
