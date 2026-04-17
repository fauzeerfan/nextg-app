import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { PrismaModule } from '../prisma/prisma.module'; // Sesuaikan path
import { LoginLogService } from './login-log.service';
import { LoginLogController } from './login-log.controller';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.register({
      secret: 'RAHASIA_NEGARA_NEXTG', // Harusnya di .env
      signOptions: { expiresIn: '8h' }, // Token valid 8 jam (jam kerja shift)
    }),
  ],
  providers: [AuthService, JwtStrategy, LoginLogService],
  controllers: [AuthController, LoginLogController],
  exports: [AuthService], // Export biar bisa dipake module lain
})
export class AuthModule {}