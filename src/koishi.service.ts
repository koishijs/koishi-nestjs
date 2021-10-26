import { App } from 'koishi';
import {
  Inject,
  Injectable,
  OnApplicationBootstrap,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { KoishiModuleOptions } from './koishi.interfaces';
import { Server } from 'http';
import Koa from 'koa';
import KoaRouter from '@koa/router';
import KoaBodyParser from 'koa-bodyparser';
import { KoishiMetascanService } from './providers/koishi-metascan.service';
import { applySelector } from './utility/koishi.utility';
import { KOISHI_MODULE_OPTIONS } from './utility/koishi.constants';
import { KoishiLoggerService } from './providers/koishi-logger.service';

@Injectable()
export class KoishiService
  extends App
  implements OnModuleInit, OnApplicationBootstrap, OnModuleDestroy {
  constructor(
    @Inject(KOISHI_MODULE_OPTIONS)
    private readonly koishiModuleOptions: KoishiModuleOptions,
    private readonly metascan: KoishiMetascanService,
    private readonly koishiLogger: KoishiLoggerService,
  ) {
    super({
      ...koishiModuleOptions,
      port: 0,
    });
    this.router = new KoaRouter();
    this._nestKoaTmpInstance.use(this.router.routes());
    this._nestKoaTmpInstance.use(this.router.allowedMethods());
    this._nestKoaTmpInstance.use(KoaBodyParser());
    this.options.port = 1;
  }

  readonly _nestKoaTmpInstance = new Koa();

  private async setHttpServer() {
    const httpAdapter = this.metascan.getHttpAdapter();
    if (!httpAdapter) {
      return;
    }
    const httpServer: Server = httpAdapter.getHttpServer();
    if (httpServer instanceof Server) {
      this.logger('app').info('App using Nest HTTP Server.');
      this._httpServer = httpServer;
    }
  }

  async onModuleInit() {
    await this.setHttpServer();
    await this.metascan.preRegisterContext(this.any());
    if (this.koishiModuleOptions.usePlugins) {
      for (const pluginDesc of this.koishiModuleOptions.usePlugins) {
        const ctx = applySelector(this, pluginDesc);
        ctx.plugin(pluginDesc.plugin, pluginDesc.options);
      }
    }
  }

  async onApplicationBootstrap() {
    await this.metascan.registerContext(this.any());
    return this.start();
  }

  async onModuleDestroy() {
    await this.stop();
  }
}
