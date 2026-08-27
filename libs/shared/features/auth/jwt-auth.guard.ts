import { Injectable, ExecutionContext, Inject, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, type Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    try {
      const result = super.canActivate(context);
      const ok = await this.toPromise(result);
      return Boolean(ok) || Boolean(isPublic);
    } catch (err) {
      if (isPublic) return true;
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException();
    }
  }

  private toPromise(
    result: boolean | Promise<boolean> | Observable<boolean>,
  ): Promise<boolean> {
    if (typeof result === 'boolean') return Promise.resolve(result);
    if (typeof (result as Promise<boolean>).then === 'function') {
      return result as Promise<boolean>;
    }
    return lastValueFrom(result as Observable<boolean>);
  }
}
