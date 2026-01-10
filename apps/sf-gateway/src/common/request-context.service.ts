import { AsyncLocalStorage } from 'async_hooks';
import { Injectable } from '@nestjs/common';

export interface RequestContext {
  requestId: string;
  traceId: string;
  ip?: string;
  userAgent?: string;
  method?: string;
  path?: string;
  userId?: string;
  orgId?: string;
}

@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<RequestContext>();

  run(context: RequestContext, callback: () => void) {
    this.storage.run(context, callback);
  }

  get(): RequestContext | undefined {
    return this.storage.getStore();
  }

  setUser(userId?: string, orgId?: string) {
    const store = this.storage.getStore();
    if (!store) return;
    store.userId = userId;
    store.orgId = orgId;
  }
}
