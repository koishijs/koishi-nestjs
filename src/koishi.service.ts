import { Command, Context } from 'koishi';
import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Scope,
} from '@nestjs/common';
import {
  KoishiCommandInterceptorRegistration,
  KoishiModuleOptions,
} from './utility/koishi.interfaces';
import { Server } from 'http';
import Koa from 'koa';
import KoaBodyParser from 'koa-bodyparser';
import { KoishiMetascanService } from './providers/koishi-metascan.service';
import { KOISHI_MODULE_OPTIONS, KoishiIpSym } from './utility/koishi.constants';
import { KoishiLoggerService } from './providers/koishi-logger.service';
import { KoishiHttpDiscoveryService } from './koishi-http-discovery/koishi-http-discovery.service';
import './utility/koishi.workarounds';
import './utility/koishi.declares';
import { selectContext } from 'koishi-thirdeye';

@Injectable({
  scope: Scope.DEFAULT,
})
export class KoishiService
  extends Context
  implements OnModuleInit, OnModuleDestroy
{
  constructor(
    @Inject(KOISHI_MODULE_OPTIONS)
    private readonly koishiModuleOptions: KoishiModuleOptions,
    private readonly metascan: KoishiMetascanService,
    private readonly httpDiscovery: KoishiHttpDiscoveryService,
    private readonly koishiLogger: KoishiLoggerService,
  ) {
    super({
      ...koishiModuleOptions,
      port: 0,
    });
    this.baseDir ??= process.cwd();
    this.interceptors = this.koishiModuleOptions.globalInterceptors;
    this._nestKoaTmpInstance.use((ctx, next) => {
      ctx.request.ip = ctx.req[KoishiIpSym];
      return next();
    });
    this._nestKoaTmpInstance.use(KoaBodyParser());
    this._nestKoaTmpInstance.use(this.router.routes());
    this._nestKoaTmpInstance.use(this.router.allowedMethods());
  }

  readonly _nestKoaTmpInstance = new Koa();

  private async setHttpServer() {
    const httpAdapter = this.httpDiscovery.getHttpAdapter();
    const httpServer: Server = httpAdapter?.getHttpServer();
    if (httpServer && httpServer instanceof Server) {
      this.logger('app').info('App using Nest HTTP Server.');
      this.router._http = httpServer;
    } else {
      this.logger('app').info('No http adapters found from Nest application.');
    }
  }

  async onModuleInit() {
    if (this.forkedProvider) {
      return;
    }
    await this.setHttpServer();
    this.metascan.preRegisterContext(this);
    if (this.koishiModuleOptions.usePlugins) {
      for (const pluginDef of this.koishiModuleOptions.usePlugins) {
        const ctx = selectContext(this, pluginDef.selection);
        ctx.plugin(pluginDef.plugin, pluginDef.options);
      }
    }
    await this.metascan.registerContext(this);
    await this.start();
  }

  async onModuleDestroy() {
    if (this.forkedProvider) {
      return;
    }
    await this.stop();
  }

  addInterceptors(
    command: Command,
    interceptorDefs: KoishiCommandInterceptorRegistration[],
  ) {
    return this.metascan.addInterceptors(command, interceptorDefs);
  }

  override extend(meta = {}): this {
    return super.extend({
      ...meta,
      forkedProvider: true,
    });
  }
}
