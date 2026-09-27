import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ServicesService } from './services.service.js';
import { ClerkAuthGuard } from '../clerk/clerk-auth.guard.js';
import { CurrentUser } from '../clerk/current-user.decorator.js';
import type { User as ClerkUser } from '@clerk/backend';
import type { CreateServiceDto, UpdateServiceDto } from './dto/service.dto.js';
import { createServiceSchema, updateServiceSchema } from './dto/service.dto.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';

@Controller('services')
@UseGuards(ClerkAuthGuard)
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  async findAll(@CurrentUser() user: ClerkUser) {
    const userId = user.id;
    const services = await this.servicesService.findAll(userId);
    return {
      success: true,
      count: services.length,
      services,
    };
  }

  @Get(':id')
  async findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: ClerkUser,
  ) {
    const userId = user.id;
    const service = await this.servicesService.findOne(id, userId);
    return {
      success: true,
      service,
    };
  }

  @Post()
  async create(
    @CurrentUser() user: ClerkUser,
    @Body(new ZodValidationPipe(createServiceSchema))
    createDto: CreateServiceDto,
  ) {
    const userId = user.id;
    const service = await this.servicesService.create(userId, createDto);
    return {
      success: true,
      message: 'Service created successfully.',
      service,
    };
  }

  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: ClerkUser,
    @Body(new ZodValidationPipe(updateServiceSchema))
    updateDto: UpdateServiceDto,
  ) {
    const userId = user.id;
    const service = await this.servicesService.update(id, userId, updateDto);
    return {
      success: true,
      message: 'Service updated successfully.',
      service,
    };
  }

  @Delete(':id')
  async remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: ClerkUser,
  ) {
    const userId = user.id;
    const result = await this.servicesService.remove(id, userId);
    return {
      message: 'Service deleted successfully.',
      ...result,
    };
  }
}
