import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ClerkAuthGuard } from '../clerk/clerk-auth.guard.js';
import { CurrentUser, CurrentAuth } from '../clerk/current-user.decorator.js';
import { AuthService } from './auth.service.js';
import type { User as ClerkUser } from '@clerk/backend';
import type { ClerkDecodedToken } from '../clerk/clerk.service.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';
import { updateProfileSchema } from './dto/update-profile.dto.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Public health status endpoint for Clerk and Auth configuration.
   */
  @Get('status')
  getStatus() {
    return {
      status: 'ok',
      service: 'r3uno-auth-service',
      authProvider: 'clerk-google-oauth',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Retrieves the profile and settings of the currently authenticated Clerk / Google user.
   */
  @Get('me')
  @UseGuards(ClerkAuthGuard)
  async getMe(@CurrentUser() user: ClerkUser) {
    const profile = await this.authService.getProfile(user);
    return {
      success: true,
      user: profile,
    };
  }

  /**
   * Updates user account settings and professional profile.
   */
  @Patch('profile')
  @UseGuards(ClerkAuthGuard)
  async updateProfile(
    @CurrentUser() user: ClerkUser,
    @Body(new ZodValidationPipe(updateProfileSchema)) dto: UpdateProfileDto,
  ) {
    const updated = await this.authService.updateProfile(user, dto);
    return {
      success: true,
      message: 'Account settings updated successfully.',
      user: updated,
    };
  }

  /**
   * Retrieves specific Google OAuth details for the authenticated user.
   */
  @Get('google-info')
  @UseGuards(ClerkAuthGuard)
  async getGoogleInfo(
    @CurrentUser() user: ClerkUser,
    @CurrentAuth() auth: ClerkDecodedToken,
  ) {
    const profile = await this.authService.getProfile(user);
    return {
      success: true,
      authenticatedVia: 'Google OAuth (Clerk)',
      clerkUserId: auth.sub,
      sessionId: auth.sid,
      googleDetails: profile.googleDetails || {
        provider: 'google',
        email: profile.email,
        verified: true,
      },
      user: {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        avatarUrl: profile.avatarUrl,
        role: profile.role,
      },
    };
  }

  /**
   * Synchronizes Clerk Google user with PostgreSQL database.
   */
  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ClerkAuthGuard)
  async syncUser(@CurrentUser() user: ClerkUser) {
    const dbUser = await this.authService.syncClerkUser(user);
    return {
      success: true,
      message: 'User synchronized with database successfully.',
      user: dbUser,
    };
  }

  /**
   * Data Portability: Complete export of user personal data.
   */
  @Get('lgpd/export')
  @UseGuards(ClerkAuthGuard)
  async exportLgpdData(@CurrentUser() user: ClerkUser) {
    const data = await this.authService.exportUserData(user);
    return {
      success: true,
      dossie: data,
    };
  }

  /**
   * Data Anonymization: Anonymizes client record of a specific appointment.
   */
  @Post('lgpd/anonymize-appointment/:id')
  @UseGuards(ClerkAuthGuard)
  async anonymizeAppointment(
    @CurrentUser() user: ClerkUser,
    @Param('id') appointmentId: string,
  ) {
    const appointment = await this.authService.anonymizeAppointment(
      user,
      appointmentId,
    );
    return {
      success: true,
      message: 'Appointment personal data anonymized successfully.',
      appointment,
    };
  }

  /**
   * Right to Erasure: Permanent deletion/anonymization of user account.
   */
  @Delete('lgpd/delete-account')
  @UseGuards(ClerkAuthGuard)
  async deleteAccount(@CurrentUser() user: ClerkUser) {
    const result = await this.authService.deleteAccount(user);
    return result;
  }
}
