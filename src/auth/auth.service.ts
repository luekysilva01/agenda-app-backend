import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import type { User as ClerkUser } from '@clerk/backend';
import { User } from '../users/entities/user.entity.js';
import { Appointment } from '../appointments/entities/appointment.entity.js';
import { Service } from '../services/entities/service.entity.js';
import { ClerkService } from '../clerk/clerk.service.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';

interface ExternalAccountLike {
  provider?: string;
  verification?: {
    strategy?: string;
    status?: string;
  };
  emailAddress?: string;
  providerUserId?: string;
  googleId?: string;
  avatarUrl?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
    private readonly clerkService: ClerkService,
  ) {}

  /**
   * Generates a default URL slug from user's full name.
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }

  /**
   * Synchronizes or retrieves a user from the database given a Clerk User object.
   */
  async syncClerkUser(clerkUser: ClerkUser): Promise<User> {
    const primaryEmailObj = clerkUser.emailAddresses?.find(
      (e) => e.id === clerkUser.primaryEmailAddressId,
    );
    const email =
      primaryEmailObj?.emailAddress ||
      clerkUser.emailAddresses?.[0]?.emailAddress ||
      '';
    const isEmailVerified =
      primaryEmailObj?.verification?.status === 'verified';

    const fullName =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
      clerkUser.username ||
      (email ? email.split('@')[0] : '') ||
      'Google User';

    const avatarUrl = clerkUser.imageUrl || null;
    const phone = clerkUser.phoneNumbers?.[0]?.phoneNumber || null;

    const externalAccounts = (clerkUser.externalAccounts ||
      []) as ExternalAccountLike[];
    const googleAccount = externalAccounts.find(
      (acc) =>
        acc.provider === 'google' ||
        acc.provider === 'oauth_google' ||
        acc.verification?.strategy === 'oauth_google',
    );
    const authProvider = googleAccount ? 'google' : 'google';

    // 1. Primary lookup by immutable Clerk ID
    let user = await this.userRepository.findOne({
      where: { clerkId: clerkUser.id },
    });

    // 2. Safe account linking: ONLY if email is verified and non-empty
    if (!user && email && isEmailVerified) {
      user = await this.userRepository.findOne({
        where: { email },
      });
    }

    if (user) {
      user.clerkId = clerkUser.id;
      user.name = user.name || fullName;
      user.avatarUrl = user.avatarUrl || avatarUrl;
      user.authProvider = authProvider;
      if (phone && !user.phone) user.phone = phone;
      if (!user.slug) user.slug = this.generateSlug(fullName);
      user = await this.userRepository.save(user);
    } else {
      user = this.userRepository.create({
        clerkId: clerkUser.id,
        email,
        name: fullName,
        avatarUrl,
        phone,
        slug: this.generateSlug(fullName),
        title: null,
        companyName: null,
        role: 'PROFESSIONAL',
        authProvider,
        status: 'ACTIVE',
      });
      user = await this.userRepository.save(user);
    }

    return user;
  }

  /**
   * Updates the authenticated user's profile and account settings.
   */
  async updateProfile(
    clerkUser: ClerkUser,
    dto: UpdateProfileDto,
  ): Promise<User> {
    let user = await this.syncClerkUser(clerkUser);

    if (dto.name !== undefined && dto.name !== null) {
      user.name = dto.name.trim();
    }
    if (dto.phone !== undefined) {
      user.phone = dto.phone ? dto.phone.trim() : null;
    }
    if (dto.slug !== undefined && dto.slug) {
      user.slug = this.generateSlug(dto.slug.trim());
    }
    if (dto.title !== undefined) {
      user.title = dto.title ? dto.title.trim() : null;
    }
    if (dto.companyName !== undefined) {
      user.companyName = dto.companyName ? dto.companyName.trim() : null;
    }
    if (dto.documentNumber !== undefined) {
      user.documentNumber = dto.documentNumber
        ? dto.documentNumber.trim()
        : null;
    }
    if (dto.emailNotifications !== undefined) {
      user.emailNotifications = Boolean(dto.emailNotifications);
    }

    user = await this.userRepository.save(user);
    return user;
  }

  /**
   * Returns authenticated user profile including Google account metadata and account settings.
   */
  async getProfile(clerkUser: ClerkUser) {
    let dbUser: User | null = null;
    try {
      dbUser = await this.syncClerkUser(clerkUser);
    } catch (error) {
      this.logger.warn(
        `Could not sync user to DB: ${(error as Error).message}`,
      );
    }

    const primaryEmailObj = clerkUser.emailAddresses?.find(
      (e) => e.id === clerkUser.primaryEmailAddressId,
    );
    const email =
      primaryEmailObj?.emailAddress ||
      clerkUser.emailAddresses?.[0]?.emailAddress ||
      '';

    const externalAccounts = (clerkUser.externalAccounts ||
      []) as ExternalAccountLike[];
    const googleAccount = externalAccounts.find(
      (acc) =>
        acc.provider === 'google' ||
        acc.provider === 'oauth_google' ||
        acc.verification?.strategy === 'oauth_google',
    );

    const name =
      dbUser?.name ||
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
      'User';

    const userEmail = dbUser?.email || email;
    const avatarUrl = dbUser?.avatarUrl || clerkUser.imageUrl || null;
    const phone =
      dbUser?.phone || clerkUser.phoneNumbers?.[0]?.phoneNumber || null;
    const slug =
      dbUser?.slug || this.generateSlug(clerkUser.firstName || 'calendar');
    const role = dbUser?.role || 'PROFESSIONAL';
    const status = dbUser?.status || 'ACTIVE';

    return {
      id: dbUser?.id || clerkUser.id,
      clerkId: clerkUser.id,
      name,
      email: userEmail,
      avatarUrl,
      phone,
      slug,
      title: dbUser?.title || '',
      companyName: dbUser?.companyName || '',
      documentNumber: dbUser?.documentNumber || '',
      emailNotifications: dbUser?.emailNotifications ?? true,
      role,
      status,
      authProvider: 'google',
      isGoogleAuth: !!googleAccount || externalAccounts.length > 0,
      googleDetails: googleAccount
        ? {
            provider: 'google',
            emailAddress: googleAccount.emailAddress || userEmail,
            googleId: googleAccount.providerUserId || googleAccount.googleId,
            avatarUrl: googleAccount.avatarUrl || avatarUrl,
            verificationStatus:
              googleAccount.verification?.status || 'verified',
          }
        : {
            provider: 'google',
            emailAddress: userEmail,
            googleId: clerkUser.id,
            avatarUrl,
            verificationStatus: 'verified',
          },
      createdAt: dbUser?.createdAt || new Date(clerkUser.createdAt),
      updatedAt: dbUser?.updatedAt || new Date(clerkUser.updatedAt),
    };
  }

  /**
   * Data Portability:
   * Exports the entire user personal data dossier in structured JSON format.
   */
  async exportUserData(clerkUser: ClerkUser) {
    const profile = await this.getProfile(clerkUser);
    const userIds = Array.from(
      new Set([profile.id, clerkUser.id].filter(Boolean)),
    );

    const [appointments, services] = await Promise.all([
      this.appointmentRepository.find({
        where: { userId: In(userIds) },
        order: { scheduledAt: 'DESC' },
      }),
      this.serviceRepository.find({
        where: { userId: In(userIds) },
        order: { name: 'ASC' },
      }),
    ]);

    return {
      dossieMetadata: {
        platform: 'R3uno - Corporate Scheduling Platform',
        purpose: 'Personal Data Portability',
        generatedAt: new Date().toISOString(),
        holderId: profile.id,
        holderName: profile.name,
        holderEmail: profile.email,
        dpoContact: 'dpo@r3uno.app',
      },
      holderProfile: profile,
      registeredServices: services,
      appointmentsHistory: appointments,
    };
  }

  /**
   * Data Anonymization:
   * Removes direct personal identifiers from an appointment.
   */
  async anonymizeAppointment(clerkUser: ClerkUser, appointmentId: string) {
    const profile = await this.getProfile(clerkUser);
    const userIds = Array.from(
      new Set([profile.id, clerkUser.id].filter(Boolean)),
    );

    const appointment = await this.appointmentRepository.findOne({
      where: userIds.map((uId) => ({ id: appointmentId, userId: uId })),
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found for this user.');
    }

    appointment.clientName = 'Anonymized Client';
    appointment.clientEmail = 'anonymized@privacy.local';
    appointment.clientPhone = '+1 (000) 000-0000';
    appointment.notes = null;

    const saved = await this.appointmentRepository.save(appointment);
    return saved;
  }

  /**
   * Right to Erasure:
   * Deletes and anonymizes user account and associated data.
   */
  async deleteAccount(clerkUser: ClerkUser) {
    const profile = await this.getProfile(clerkUser);
    const userIds = Array.from(
      new Set([profile.id, clerkUser.id].filter(Boolean)),
    );

    // Remove appointments and services
    await this.appointmentRepository.delete({ userId: In(userIds) });
    await this.serviceRepository.delete({ userId: In(userIds) });

    // Anonymize/delete user profile
    const user = await this.userRepository.findOne({
      where: [{ id: profile.id }, { clerkId: clerkUser.id }],
    });
    if (user) {
      user.status = 'DELETED_BY_HOLDER';
      user.name = 'Anonymized User';
      user.email = `deleted_${Date.now()}@privacy.local`;
      user.phone = null;
      user.documentNumber = null;
      user.companyName = null;
      await this.userRepository.save(user);
    }

    return {
      success: true,
      message: 'All personal data was deleted/anonymized successfully.',
      deletedAt: new Date().toISOString(),
    };
  }
}
