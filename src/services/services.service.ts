import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service } from './entities/service.entity.js';
import { CreateServiceDto, UpdateServiceDto } from './dto/service.dto.js';

@Injectable()
export class ServicesService {
  private readonly logger = new Logger(ServicesService.name);

  constructor(
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
  ) {}

  async findAll(userId: string): Promise<Service[]> {
    return this.serviceRepository.find({
      where: { userId },
      order: { createdAt: 'ASC' },
      take: 100, // Safe query limit preventing memory / network exhaustion
    });
  }

  async findOne(id: string, userId: string): Promise<Service> {
    const service = await this.serviceRepository.findOne({
      where: { id, userId },
    });

    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found.`);
    }

    return service;
  }

  async create(userId: string, dto: CreateServiceDto): Promise<Service> {
    const service = this.serviceRepository.create({
      userId,
      name: dto.name,
      description: dto.description || null,
      durationMinutes: dto.durationMinutes ?? 45,
      category: dto.category || 'General',
      isActive: dto.isActive ?? true,
    });

    return this.serviceRepository.save(service);
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateServiceDto,
  ): Promise<Service> {
    const service = await this.findOne(id, userId);

    if (dto.name !== undefined) service.name = dto.name;
    if (dto.description !== undefined) service.description = dto.description;
    if (dto.durationMinutes !== undefined)
      service.durationMinutes = dto.durationMinutes;
    if (dto.category !== undefined) service.category = dto.category;
    if (dto.isActive !== undefined) service.isActive = dto.isActive;

    return this.serviceRepository.save(service);
  }

  async remove(
    id: string,
    userId: string,
  ): Promise<{ success: boolean; id: string }> {
    const service = await this.findOne(id, userId);
    await this.serviceRepository.remove(service);
    return { success: true, id };
  }
}
