import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { KoishiCommandInterceptorRegistration } from '../utility/koishi.interfaces';
import { Command } from 'koishi';
import { KoishiExceptionHandlerService } from '../koishi-exception-handler/koishi-exception-handler.service';

@Injectable()
export class KoishiInterceptorManagerService {
  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly exceptionHandler: KoishiExceptionHandlerService,
  ) {}
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
    command.before(async (...params) => {
      try {
        return await interceptor.intercept(...params);
      } catch (e) {
        return this.exceptionHandler.handleActionException(e);
      }
    });
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
