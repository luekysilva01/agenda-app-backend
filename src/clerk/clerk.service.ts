import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClerkClient, verifyToken } from '@clerk/backend';

export interface ClerkDecodedToken {
  sub: string;
  sid?: string;
  [key: string]: unknown;
}

interface ExternalAccountLike {
  provider?: string;
  verification?: {
    strategy?: string;
    status?: string;
  };
  emailAddress?: string;
  providerUserId?: string;
  avatarUrl?: string;
}

@Injectable()
export class ClerkService {
  private readonly logger = new Logger(ClerkService.name);
  private readonly clerkClient: ReturnType<typeof createClerkClient>;
  private readonly secretKey: string;
  private readonly publishableKey: string;

  constructor(private readonly configService: ConfigService) {
    this.secretKey =
      this.configService.get<string>('CLERK_SECRET_KEY') ||
      process.env.CLERK_SECRET_KEY ||
      '';
    this.publishableKey =
      this.configService.get<string>('CLERK_PUBLISHABLE_KEY') ||
      process.env.CLERK_PUBLISHABLE_KEY ||
      '';

    if (!this.secretKey) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'FATAL: CLERK_SECRET_KEY is mandatory in production environment.',
        );
      } else {
        this.logger.warn(
          'CLERK_SECRET_KEY is not defined in environment variables.',
        );
      }
    }

    this.clerkClient = createClerkClient({
      secretKey: this.secretKey,
      publishableKey: this.publishableKey,
    });
  }

  get client() {
    return this.clerkClient;
  }

  async verifyToken(token: string): Promise<ClerkDecodedToken> {
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      throw new Error('Token must be a non-empty string.');
    }

    try {
      const decoded = await verifyToken(token.trim(), {
        secretKey: this.secretKey,
      });

      return decoded;
    } catch (error) {
      this.logger.error(
        `Failed to verify Clerk token: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  async getUser(userId: string) {
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      throw new Error('User ID must be provided.');
    }

    try {
      return await this.clerkClient.users.getUser(userId.trim());
    } catch (error) {
      this.logger.error(
        `Failed to fetch user ${userId} from Clerk: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  async getGoogleAccount(userId: string) {
    const user = await this.getUser(userId);
    const externalAccounts = (user.externalAccounts ||
      []) as ExternalAccountLike[];
    const googleAccount = externalAccounts.find(
      (acc) =>
        acc.provider === 'google' ||
        acc.provider === 'oauth_google' ||
        acc.verification?.strategy === 'oauth_google',
    );
    return {
      user,
      isGoogleAuth: !!googleAccount || externalAccounts.length > 0,
      googleAccount: googleAccount || null,
    };
  }
}
