import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { UserRegisterDto } from 'src/dto/auth/user-register.dto';

@Injectable()
export class UsersService {
  constructor(private readonly databaseService: DatabaseService) {}

  findByEmail(email: string) {
    return this.databaseService.user.findUnique({
      where: { email },
    });
  }

  findById(id: number) {
    return this.databaseService.user.findUnique({
      where: { id },
    });
  }

  createUser(data: UserRegisterDto, passwordHash: string) {
    return this.databaseService.user.create({
      data: {
        email: data.email,
        password: passwordHash,
      },
    });
  }
}
