import { App } from 'koishi';
import {
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
import { KoishiMetascanService } from './koishi-metascan.service';

@Injectable()
export class KoishiService
  extends App
  implements OnModuleInit, OnApplicationBootstrap, OnModuleDestroy {
  constructor(
    private readonly koishiModuleOptions: KoishiModuleOptions,
    private readonly metascan: KoishiMetascanService,
  ) {
    super({
      ...koishiModuleOptions,
      port: 0,
    });
    this.router = new KoaRouter();
    this._nestKoaTmpInstance.use(this.router.routes());
    this._nestKoaTmpInstance.use(this.router.allowedMethods());
    this._nestKoaTmpInstance.use(KoaBodyParser());
  }

  _nestKoaTmpInstance = new Koa();
  _nestKoaTmpServer: Server;
  _nestKoaTmpServerPort: number;

  private async setHttpServer() {
    const httpAdapter = this.metascan.getHttpAdapter();
    if (httpAdapter) {
      const httpServer: Server = httpAdapter.getHttpServer();
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

  async onApplicationBootstrap() {
    await this.metascan.registerContext(this.any());
    return this.start();
  }

  async onModuleDestroy() {
    await this.stop();
    if (this._nestKoaTmpServer) {
      this._nestKoaTmpServer.close();
    }
  }
}
