import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { User } from '../users/entities/user.entity.js';
import { Appointment } from '../appointments/entities/appointment.entity.js';
import { Service } from '../services/entities/service.entity.js';
import { ClerkModule } from '../clerk/clerk.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Appointment, Service]),
    ClerkModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
