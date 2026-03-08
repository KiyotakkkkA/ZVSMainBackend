import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { UserRegisterDto } from 'src/dto/auth/user-register.dto';

@Injectable()
export class UsersService {
  constructor(private readonly databaseService: DatabaseService) {}

  createUser(data: UserRegisterDto) {
    return {
      email: data.email,
      password: data.password,
      passwordConfirm: data.passwordConfirm,
    };
  }
}
