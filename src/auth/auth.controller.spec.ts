import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { ClerkService } from '../clerk/clerk.service.js';
import { ClerkAuthGuard } from '../clerk/clerk-auth.guard.js';
import type { User as ClerkUser } from '@clerk/backend';
import { User } from '../users/entities/user.entity.js';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: Partial<AuthService>;
  let clerkService: Partial<ClerkService>;

  beforeEach(async () => {
    authService = {
      getProfile: jest.fn().mockReturnValue(
        Promise.resolve({
          id: 'usr_123',
          clerkId: 'user_clerk_123',
          name: 'Dr. Teste Google',
          email: 'teste@gmail.com',
          avatarUrl: 'https://images.clerk.dev/avatar.png',
          role: 'PROFESSIONAL',
          status: 'ACTIVE',
          authProvider: 'google',
          isGoogleAuth: true,
          phone: null,
          slug: 'dr-teste-google',
          googleDetails: {
            provider: 'google',
            emailAddress: 'teste@gmail.com',
            googleId: 'g_123',
            avatarUrl: 'https://images.clerk.dev/avatar.png',
            verificationStatus: 'verified',
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ),
      syncClerkUser: jest.fn().mockReturnValue(
        Promise.resolve({
          id: 'usr_123',
          clerkId: 'user_clerk_123',
          email: 'teste@gmail.com',
          name: 'Dr. Teste Google',
          avatarUrl: 'https://images.clerk.dev/avatar.png',
          phone: null,
          slug: 'dr-teste-google',
          role: 'PROFESSIONAL',
          authProvider: 'google',
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as User),
      ),
    };

    clerkService = {
      verifyToken: jest
        .fn()
        .mockResolvedValue({ sub: 'user_clerk_123', sid: 'sess_123' }),
      getUser: jest.fn().mockResolvedValue({
        id: 'user_clerk_123',
        firstName: 'Dr. Teste',
        lastName: 'Google',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authService,
        },
        {
          provide: ClerkService,
          useValue: clerkService,
        },
        {
          provide: ClerkAuthGuard,
          useValue: { canActivate: () => true },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getStatus should return auth status and provider info', () => {
    const res = controller.getStatus();
    expect(res.status).toBe('ok');
    expect(res.authProvider).toBe('clerk-google-oauth');
  });

  it('getMe should return authenticated user profile', async () => {
    const mockClerkUser = {
      id: 'user_clerk_123',
      firstName: 'Dr. Teste',
      lastName: 'Google',
      emailAddresses: [{ id: 'em_1', emailAddress: 'teste@gmail.com' }],
      primaryEmailAddressId: 'em_1',
    } as unknown as ClerkUser;

    const res = await controller.getMe(mockClerkUser);
    expect(res.success).toBe(true);
    expect(res.user.email).toBe('teste@gmail.com');
    expect(res.user.isGoogleAuth).toBe(true);
  });

  it('getGoogleInfo should return google verification details', async () => {
    const mockClerkUser = {
      id: 'user_clerk_123',
      firstName: 'Dr. Teste',
      lastName: 'Google',
      emailAddresses: [{ id: 'em_1', emailAddress: 'teste@gmail.com' }],
      primaryEmailAddressId: 'em_1',
    } as unknown as ClerkUser;

    const mockAuth = {
      sub: 'user_clerk_123',
      sid: 'sess_123',
    };

    const res = await controller.getGoogleInfo(mockClerkUser, mockAuth);
    expect(res.success).toBe(true);
    expect(res.authenticatedVia).toBe('Google OAuth (Clerk)');
    expect(res.clerkUserId).toBe('user_clerk_123');
  });
});
