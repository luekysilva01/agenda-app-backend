import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ClerkModule } from './clerk/clerk.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AppointmentsModule } from './appointments/appointments.module.js';
import { ServicesModule } from './services/services.module.js';
import { User } from './users/entities/user.entity.js';
import { Appointment } from './appointments/entities/appointment.entity.js';
import { Service } from './services/entities/service.entity.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProduction = config.get<string>('NODE_ENV') === 'production';
        return {
          type: 'postgres',
          host: config.get<string>('DB_HOST', 'localhost'),
          port: config.get<number>('DB_PORT', 5432),
          username: config.get<string>('DB_USERNAME', 'postgres'),
          password: config.get<string>('DB_PASSWORD', 'postgres'),
          database: config.get<string>('DB_NAME', 'r3uno_db'),
          entities: [User, Appointment, Service],
          autoLoadEntities: true,
          // OWASP A05 Security Misconfiguration: Never allow automatic synchronization in production
          synchronize:
            !isProduction &&
            config.get<string>('TYPEORM_SYNC', 'true') === 'true',
        };
      },
    }),
    ClerkModule,
    AuthModule,
    AppointmentsModule,
    ServicesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
