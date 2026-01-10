import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import {
  RequestContext,
  RequestContextService,
} from './request-context.service';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly contextService: RequestContextService) {}

  use(
    req: Request & { requestId?: string; traceId?: string },
    res: Response,
    next: NextFunction,
  ) {
    const incomingRequestId =
      (req.headers['x-request-id'] as string) || undefined;
    const incomingTraceId = (req.headers['x-trace-id'] as string) || undefined;

    const requestId = incomingRequestId || randomUUID();
    const traceId = incomingTraceId || randomUUID();

    req.requestId = requestId;
    req.traceId = traceId;

    res.setHeader('X-Request-Id', requestId);
    res.setHeader('X-Trace-Id', traceId);

    const context: RequestContext = {
      requestId,
      traceId,
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      method: req.method,
      path: req.originalUrl || req.url,
    };

    this.contextService.run(context, next);
  }
}
