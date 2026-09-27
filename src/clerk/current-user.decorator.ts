import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

interface RequestWithUserAuth extends Request {
  user?: Record<string, unknown>;
  auth?: Record<string, unknown>;
}

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext): unknown => {
    const request = ctx.switchToHttp().getRequest<RequestWithUserAuth>();
    const user = request.user;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);

export const CurrentAuth = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext): unknown => {
    const request = ctx.switchToHttp().getRequest<RequestWithUserAuth>();
    const auth = request.auth;

    if (!auth) {
      return null;
    }

    return data ? auth[data] : auth;
  },
);
