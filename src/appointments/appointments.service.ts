import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from './entities/appointment.entity.js';
import {
  CreateAppointmentDto,
  UpdateAppointmentDto,
} from './dto/appointment.dto.js';
import { escapeSqlLike } from '../common/helpers/security.helper.js';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
  ) {}

  /**
   * Retrieves all appointments for a user with optional filtering.
   */
  async findAll(
    userId: string,
    filters?: { status?: string; date?: string; search?: string },
  ): Promise<Appointment[]> {
    const query = this.appointmentRepository
      .createQueryBuilder('appointment')
      .where('appointment.userId = :userId', { userId });

    if (filters?.status && filters.status !== 'ALL') {
      query.andWhere('appointment.status = :status', {
        status: filters.status,
      });
    }

    if (filters?.search?.trim()) {
      const searchPattern = `%${escapeSqlLike(filters.search.trim().toLowerCase())}%`;
      query.andWhere(
        "(LOWER(appointment.clientName) LIKE :search ESCAPE '\\' OR LOWER(appointment.clientEmail) LIKE :search ESCAPE '\\' OR appointment.clientPhone LIKE :search ESCAPE '\\')",
        { search: searchPattern },
      );
    }

    if (filters?.date) {
      const parsedDate = new Date(filters.date);
      if (!isNaN(parsedDate.getTime())) {
        const startOfDay = new Date(parsedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(parsedDate);
        endOfDay.setHours(23, 59, 59, 999);

        query.andWhere(
          'appointment.scheduledAt >= :startOfDay AND appointment.scheduledAt <= :endOfDay',
          { startOfDay, endOfDay },
        );
      }
    }

    query.orderBy('appointment.scheduledAt', 'ASC');
    query.take(100); // Enforce safe upper bound to prevent resource exhaustion

    return query.getMany();
  }

  /**
   * Finds a single appointment by ID.
   */
  async findOne(id: string, userId: string): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findOne({
      where: { id, userId },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${id} not found.`);
    }

    return appointment;
  }

  /**
   * Creates a new appointment.
   */
  async create(
    userId: string,
    dto: CreateAppointmentDto,
  ): Promise<Appointment> {
    const scheduledDate = new Date(dto.scheduledAt);

    const appointment = this.appointmentRepository.create({
      userId,
      clientName: dto.clientName,
      clientEmail: dto.clientEmail,
      clientPhone: dto.clientPhone,
      serviceId: dto.serviceId || null,
      serviceName: dto.serviceName,
      scheduledAt: scheduledDate,
      durationMinutes: dto.durationMinutes ?? 45,
      status: dto.status ?? 'CONFIRMED',
      notes: dto.notes ?? null,
    });

    const saved = await this.appointmentRepository.save(appointment);
    this.logger.log(`Created new appointment ${saved.id} for user ${userId}`);
    return saved;
  }

  /**
   * Updates an existing appointment.
   */
  async update(
    id: string,
    userId: string,
    dto: UpdateAppointmentDto,
  ): Promise<Appointment> {
    const appointment = await this.findOne(id, userId);

    if (dto.clientName !== undefined) appointment.clientName = dto.clientName;
    if (dto.clientEmail !== undefined)
      appointment.clientEmail = dto.clientEmail;
    if (dto.clientPhone !== undefined)
      appointment.clientPhone = dto.clientPhone;
    if (dto.serviceName !== undefined)
      appointment.serviceName = dto.serviceName;
    if (dto.scheduledAt !== undefined)
      appointment.scheduledAt = new Date(dto.scheduledAt);
    if (dto.durationMinutes !== undefined)
      appointment.durationMinutes = dto.durationMinutes;
    if (dto.status !== undefined) appointment.status = dto.status;
    if (dto.notes !== undefined) appointment.notes = dto.notes;

    return this.appointmentRepository.save(appointment);
  }

  /**
   * Removes / cancels an appointment.
   */
  async remove(
    id: string,
    userId: string,
  ): Promise<{ success: boolean; id: string }> {
    const appointment = await this.findOne(id, userId);
    await this.appointmentRepository.remove(appointment);
    return { success: true, id };
  }

  /**
   * Calculates dashboard summary statistics for the user via SQL aggregation.
   */
  async getStats(userId: string) {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0,
    );
    const endOfToday = new Date(startOfToday.getTime() + 24 * 3600 * 1000);

    const stats = await this.appointmentRepository
      .createQueryBuilder('appointment')
      .select('COUNT(*)', 'total')
      .addSelect(
        "SUM(CASE WHEN appointment.status = 'CONFIRMED' THEN 1 ELSE 0 END)",
        'confirmed',
      )
      .addSelect(
        "SUM(CASE WHEN appointment.status = 'COMPLETED' THEN 1 ELSE 0 END)",
        'completed',
      )
      .addSelect(
        "SUM(CASE WHEN appointment.status = 'CANCELLED' THEN 1 ELSE 0 END)",
        'cancelled',
      )
      .addSelect(
        "SUM(CASE WHEN appointment.status = 'NO_SHOW' THEN 1 ELSE 0 END)",
        'noShow',
      )
      .addSelect(
        'SUM(CASE WHEN appointment.scheduledAt >= :startOfToday AND appointment.scheduledAt < :endOfToday THEN 1 ELSE 0 END)',
        'todayCount',
      )
      .where('appointment.userId = :userId', { userId })
      .setParameters({ startOfToday, endOfToday })
      .getRawOne<{
        total: string;
        confirmed: string | null;
        completed: string | null;
        cancelled: string | null;
        noShow: string | null;
        todayCount: string | null;
      }>();

    const totalScheduled = parseInt(stats?.total ?? '0', 10);
    const confirmed = parseInt(stats?.confirmed ?? '0', 10);
    const completed = parseInt(stats?.completed ?? '0', 10);
    const cancelled = parseInt(stats?.cancelled ?? '0', 10);
    const noShow = parseInt(stats?.noShow ?? '0', 10);
    const todayCount = parseInt(stats?.todayCount ?? '0', 10);

    const attendanceRate =
      totalScheduled > 0
        ? Number(
            (((totalScheduled - noShow) / totalScheduled) * 100).toFixed(1),
          )
        : 100;

    return {
      todayCount,
      totalScheduled,
      confirmed,
      completed,
      cancelled,
      noShow,
      attendanceRate,
    };
  }
}
