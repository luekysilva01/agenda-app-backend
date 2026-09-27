import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';
import { ClerkService } from './clerk.service.js';

interface AuthenticatedRequest extends Request {
  auth?: unknown;
  user?: unknown;
}

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private readonly logger = new Logger(ClerkAuthGuard.name);

  constructor(private readonly clerkService: ClerkService) {}

  private extractToken(request: AuthenticatedRequest): string | null {
    // 1. Check Authorization header
    const authHeader = request.headers.authorization;
    if (authHeader) {
      const [bearer, token] = authHeader.split(' ');
      if (bearer === 'Bearer' && token && token.trim().length > 0) {
        return token.trim();
      }
    }

    // 2. Check cookies header
    const cookieHeader = request.headers.cookie;
    if (cookieHeader) {
      const parsedCookies = cookieHeader
        .split(';')
        .reduce<Record<string, string>>((acc, item) => {
          const [k, ...v] = item.trim().split('=');
          if (k) acc[k] = decodeURIComponent(v.join('='));
          return acc;
        }, {});

      if (parsedCookies['r3uno_access_token']?.trim()) {
        return parsedCookies['r3uno_access_token'].trim();
      }
      if (parsedCookies['__session']?.trim()) {
        return parsedCookies['__session'].trim();
      }
    }

    // 3. Check request.cookies (if cookie-parser is used)
    const rawCookies: unknown = (request as unknown as { cookies?: unknown })
      .cookies;
    if (rawCookies && typeof rawCookies === 'object') {
      const typedCookies = rawCookies as Record<string, unknown>;
      const r3unoToken = typedCookies['r3uno_access_token'];
      if (typeof r3unoToken === 'string' && r3unoToken.trim().length > 0) {
        return r3unoToken.trim();
      }
      const sessionToken = typedCookies['__session'];
      if (typeof sessionToken === 'string' && sessionToken.trim().length > 0) {
        return sessionToken.trim();
      }
    }

    return null;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException(
        'Authorization token not provided (missing Authorization header or cookie).',
      );
    }

    try {
      const decoded = await this.clerkService.verifyToken(token);
      const user = await this.clerkService.getUser(decoded.sub);

      request.auth = decoded;
      request.user = user;

      return true;
    } catch (error) {
      this.logger.warn(
        `Unauthorized access attempt: ${(error as Error).message}`,
      );
      throw new UnauthorizedException(
        'Invalid, expired, or unauthorized Clerk token.',
      );
    }
  }
}
