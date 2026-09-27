import { Module, Global } from '@nestjs/common';
import { ClerkService } from './clerk.service.js';
import { ClerkAuthGuard } from './clerk-auth.guard.js';

@Global()
@Module({
  providers: [ClerkService, ClerkAuthGuard],
  exports: [ClerkService, ClerkAuthGuard],
})
export class ClerkModule {}
