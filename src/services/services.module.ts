import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Service } from './entities/service.entity.js';
import { ServicesService } from './services.service.js';
import { ServicesController } from './services.controller.js';
import { ClerkModule } from '../clerk/clerk.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Service]), ClerkModule],
  controllers: [ServicesController],
  providers: [ServicesService],
  exports: [ServicesService],
})
export class ServicesModule {}
