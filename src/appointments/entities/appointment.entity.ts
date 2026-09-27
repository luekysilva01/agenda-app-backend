import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type AppointmentStatus =
  'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 255 })
  userId: string;

  @Column({ type: 'varchar', length: 255 })
  clientName: string;

  @Column({ type: 'varchar', length: 255 })
  clientEmail: string;

  @Column({ type: 'varchar', length: 50 })
  clientPhone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  serviceId: string | null;

  @Column({ type: 'varchar', length: 255 })
  serviceName: string;

  @Index()
  @Column({ type: 'timestamp with time zone' })
  scheduledAt: Date;

  @Column({ type: 'int', default: 45 })
  durationMinutes: number;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'CONFIRMED',
  })
  status: AppointmentStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
