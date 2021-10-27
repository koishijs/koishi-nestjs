import { Injectable } from '@nestjs/common';
import { AbstractHttpAdapter, HttpAdapterHost, ModuleRef } from '@nestjs/core';
import { AbstractWsAdapter } from '@nestjs/websockets';

@Injectable()
export class KoishiHttpDiscoveryService {
  constructor(private readonly moduleRef: ModuleRef) {}

  getHttpAdapter(): AbstractHttpAdapter {
    const apdaterHost = this.moduleRef.get(HttpAdapterHost, { strict: false });
    if (apdaterHost) {
      return apdaterHost.httpAdapter;
    } else {
      return null;
    }
  }
}
