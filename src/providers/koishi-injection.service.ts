import { Inject, Injectable } from '@nestjs/common';
import { KoishiService } from '../koishi.service';
import { KoishiContextService } from './koishi-context.service';
import { ModulesContainer } from '@nestjs/core';
import { KoishiMetadataFetcherService } from '../koishi-metadata-fetcher/koishi-metadata-fetcher.service';
import {
  KOISHI_MODULE_OPTIONS,
  KoishiCommandInterceptorDef,
} from '../utility/koishi.constants';
import { KoishiModuleOptions } from '../utility/koishi.interfaces';
import { Context } from 'koishi';
import {} from '../utility/koishi.workarounds';

@Injectable()
export class KoishiInjectionService {
  constructor(
    private readonly koishi: KoishiService,
    private readonly ctxService: KoishiContextService,
    private readonly metaFetcher: KoishiMetadataFetcherService,
    private moduleContainer: ModulesContainer,
    @Inject(KOISHI_MODULE_OPTIONS)
    private readonly koishiModuleOptions: KoishiModuleOptions,
  ) {}

  getInjectContext(inquerier: string | any) {
    const token =
      typeof inquerier === 'string' ? inquerier : inquerier.constructor;
    const interceptors = this.metaFetcher.getMetadataArray(
      KoishiCommandInterceptorDef,
      token,
    );
    let ctx: Context = this.koishi.withInterceptors(interceptors);
    for (const module of this.moduleContainer.values()) {
      if (module.hasProvider(token) || module.controllers.has(token)) {
        ctx = this.ctxService.getModuleCtx(ctx, module);
      }
    }
    ctx = this.ctxService.getProviderCtx(ctx, token);
    return ctx;
  }
}
