import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable } from '@nestjs/common';

interface RequestContext {
  correlationId: string;
}

@Injectable()
export class RequestContextService {
  private static storage = new AsyncLocalStorage<RequestContext>();

  static run(context: RequestContext, fn: () => void) {
    RequestContextService.storage.run(context, fn);
  }

  static getCorrelationId(): string | undefined {
    return RequestContextService.storage.getStore()?.correlationId;
  }

  static setCorrelationId(id: string) {
    const store = RequestContextService.storage.getStore();
    if (store) {
      store.correlationId = id;
    }
  }
}
