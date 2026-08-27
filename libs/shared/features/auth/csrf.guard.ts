import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const method = (req.method || 'GET').toUpperCase();

    if (SAFE_METHODS.has(method)) {
      return true;
    }

    // Webhooks and other public unsafe routes still need CSRF exemption
    // when they authenticate via signature (Paystack) rather than cookies.
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const cookieToken = req.cookies?.csrf_token as string | undefined;
    const headerToken =
      (req.headers['x-csrf-token'] as string | undefined) ||
      (req.headers['X-CSRF-Token'] as string | undefined);

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      throw new ForbiddenException('Invalid CSRF token');
    }

    return true;
  }
}
