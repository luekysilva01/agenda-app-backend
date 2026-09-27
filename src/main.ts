import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { Logger } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const isDev = process.env.NODE_ENV !== 'production';

  // Enterprise Security Headers (OWASP A05: Security Misconfiguration)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: [
            "'self'",
            'https://clerk.com',
            'https://*.clerk.accounts.dev',
          ],
          fontSrc: ["'self'", 'https:', 'data:'],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: isDev ? null : [],
        },
      },
      crossOriginEmbedderPolicy: false,
      hidePoweredBy: true,
      hsts: isDev
        ? false
        : {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
          },
      noSniff: true,
      frameguard: { action: 'deny' },
    }),
  );

  const configuredOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const devOrigins = isDev
    ? [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3001',
      ]
    : [];

  const allowedOrigins = Array.from(
    new Set([...configuredOrigins, ...devOrigins]),
  );

  // Strict CORS policy preventing unauthorized cross-origin requests
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) {
        // Allow server-to-server or non-browser tools
        callback(null, true);
        return;
      }

      let isDevAllowed = false;
      if (isDev) {
        try {
          const parsed = new URL(origin);
          isDevAllowed =
            (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
            (parsed.hostname === 'localhost' ||
              parsed.hostname === '127.0.0.1');
        } catch {
          isDevAllowed = false;
        }
      }

      const isAllowed = allowedOrigins.includes(origin) || isDevAllowed;

      if (isAllowed) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked request from origin: ${origin}`);
        callback(null, false);
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
      'Cookie',
    ],
    credentials: true,
  });

  const port = process.env.PORT ?? 3333;
  await app.listen(port);
  logger.log(`Backend server successfully running on port ${port}`);
}
void bootstrap();
