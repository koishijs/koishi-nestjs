import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { KoishiCommandInterceptorRegistration } from '../utility/koishi.interfaces';
import { Command } from 'koishi';

@Injectable()
export class KoishiInterceptorManagerService {
  constructor(private readonly moduleRef: ModuleRef) {}
  getInterceptor(interceptorDef: KoishiCommandInterceptorRegistration) {
    if (typeof interceptorDef !== 'object') {
      return this.moduleRef.get(interceptorDef, { strict: false });
    }
    return interceptorDef;
  }

  addInterceptor(
    command: Command,
    interceptorDef: KoishiCommandInterceptorRegistration,
  ) {
    const interceptor = this.getInterceptor(interceptorDef);
    command.before((...params) => interceptor.intercept(...params));
  }

  addInterceptors(
    command: Command,
    interceptorDefs: KoishiCommandInterceptorRegistration[],
  ) {
    if (!interceptorDefs) {
      return;
    }
    interceptorDefs.forEach((interceptorDef) =>
      this.addInterceptor(command, interceptorDef),
    );
  }
}
