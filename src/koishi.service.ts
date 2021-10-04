import { App } from 'koishi';
import {
  Inject,
  Injectable,
  OnApplicationBootstrap,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { KOISHI_MODULE_OPTIONS } from './koishi.constants';
import { KoishiModuleOptions } from './koishi.interfaces';
import { Server } from 'http';
import Koa from 'koa';
import KoaRouter from '@koa/router';

@Injectable()
export class KoishiService
  extends App
  implements OnModuleInit, OnApplicationBootstrap, OnModuleDestroy {
  constructor(
    @Inject(KOISHI_MODULE_OPTIONS)
    private readonly koishiModuleOptions: KoishiModuleOptions,
  ) {
    super({
      ...koishiModuleOptions,
      port: 0,
    });
    this.router = new KoaRouter();
    this._nestKoaTmpInstance.use(this.router.routes());
    this._nestKoaTmpInstance.use(this.router.allowedMethods());
  }

  _nestKoaTmpInstance = new Koa();
  _nestKoaTmpServer: Server;
  _nestKoaTmpServerPort: number;

  private async setHttpServer() {
    if (this.koishiModuleOptions.httpAdapter) {
      const httpServer: Server = this.koishiModuleOptions.httpAdapter.getHttpServer();
      if (httpServer instanceof Server) {
        this.logger('app').info('App using Nest HTTP Server.');
        this._httpServer = httpServer;
      }
    } else {
      this._httpServer = this._nestKoaTmpServer;
    }
  }

  async onModuleInit() {
    await this.setHttpServer();
    if (this.koishiModuleOptions.usePlugins) {
      for (const pluginDesc of this.koishiModuleOptions.usePlugins) {
        const ctx = pluginDesc.select
          ? this.select(pluginDesc.select)
          : this.any();
        ctx.plugin(pluginDesc.plugin, pluginDesc.options);
      }
    }
  }

  onApplicationBootstrap() {
    return this.start();
  }

  async onModuleDestroy() {
    await this.stop();
    if (this._nestKoaTmpServer) {
      this._nestKoaTmpServer.close();
    }
  }
}
