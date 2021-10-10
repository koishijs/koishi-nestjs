import { Injectable } from '@nestjs/common';
import { KoishiService } from '../koishi.service';
import { KoishiContextService } from './koishi-context.service';
import { ModulesContainer } from '@nestjs/core';

@Injectable()
export class KoishiInjectionService {
  constructor(
    private readonly koishi: KoishiService,
    private readonly ctxService: KoishiContextService,
    private moduleContainer: ModulesContainer,
  ) {}

  getInjectContext(inquerier: string | any) {
    let ctx = this.koishi.any();
    const token =
      typeof inquerier === 'string' ? inquerier : inquerier.constructor;
    for (const module of this.moduleContainer.values()) {
      if (module.hasProvider(token) || module.controllers.has(token)) {
        ctx = this.ctxService.getModuleCtx(ctx, module);
      }
    }
    return ctx;
  }
}
