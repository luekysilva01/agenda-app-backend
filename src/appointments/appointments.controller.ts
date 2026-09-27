import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service.js';
import { ClerkAuthGuard } from '../clerk/clerk-auth.guard.js';
import { CurrentUser } from '../clerk/current-user.decorator.js';
import type { User as ClerkUser } from '@clerk/backend';
import type {
  CreateAppointmentDto,
  UpdateAppointmentDto,
} from './dto/appointment.dto.js';
import {
  createAppointmentSchema,
  updateAppointmentSchema,
} from './dto/appointment.dto.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';

@Controller('appointments')
@UseGuards(ClerkAuthGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get('stats')
  async getStats(@CurrentUser() user: ClerkUser) {
    const userId = user.id;
    const stats = await this.appointmentsService.getStats(userId);
    return {
      success: true,
      stats,
    };
  }

  @Get()
  async findAll(
    @CurrentUser() user: ClerkUser,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('date') date?: string,
  ) {
    const userId = user.id;
    const appointments = await this.appointmentsService.findAll(userId, {
      status,
      search,
      date,
    });
    return {
      success: true,
      count: appointments.length,
      appointments,
    };
  }

  @Get(':id')
  async findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: ClerkUser,
  ) {
    const userId = user.id;
    const appointment = await this.appointmentsService.findOne(id, userId);
    return {
      success: true,
      appointment,
    };
  }

  @Post()
  async create(
    @CurrentUser() user: ClerkUser,
    @Body(new ZodValidationPipe(createAppointmentSchema))
    createDto: CreateAppointmentDto,
  ) {
    const userId = user.id;
    const appointment = await this.appointmentsService.create(
      userId,
      createDto,
    );
    return {
      success: true,
      message: 'Appointment created successfully.',
      appointment,
    };
  }

  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: ClerkUser,
    @Body(new ZodValidationPipe(updateAppointmentSchema))
    updateDto: UpdateAppointmentDto,
  ) {
    const userId = user.id;
    const appointment = await this.appointmentsService.update(
      id,
      userId,
      updateDto,
    );
    return {
      success: true,
      message: 'Appointment updated successfully.',
      appointment,
    };
  }

  @Delete(':id')
  async remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: ClerkUser,
  ) {
    const userId = user.id;
    const result = await this.appointmentsService.remove(id, userId);
    return {
      message: 'Appointment cancelled and removed successfully.',
      ...result,
    };
  }
}
