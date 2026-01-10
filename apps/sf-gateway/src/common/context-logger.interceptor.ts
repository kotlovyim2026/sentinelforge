import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { tap } from 'rxjs/operators';
import { RequestContextService } from './request-context.service';

@Injectable()
export class ContextLoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  constructor(private readonly contextService: RequestContextService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const now = Date.now();
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      tap(() => {
        const ctx = this.contextService.get();
        const status = res.statusCode;
        const latency = Date.now() - now;
        this.logger.log(
          `${req.method} ${req.originalUrl || req.url} ${status} ${latency}ms requestId=${ctx?.requestId ?? 'n/a'} traceId=${ctx?.traceId ?? 'n/a'}`,
        );
      }),
    );
  }
}
