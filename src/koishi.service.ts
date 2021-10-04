import { App } from 'koishi';
import {
  Inject,
  Injectable,
  OnApplicationBootstrap,
  OnModuleInit,
} from '@nestjs/common';
import { KOISHI_MODULE_OPTIONS } from './koishi.constants';
import { KoishiModuleOptions } from './koishi.interfaces';
import { Server } from 'http';

@Injectable()
export class KoishiService
  extends App
  implements OnModuleInit, OnApplicationBootstrap {
  constructor(
    @Inject(KOISHI_MODULE_OPTIONS)
    private readonly koishiModuleOptions: KoishiModuleOptions,
  ) {
    super(koishiModuleOptions);
  }

  private setHttpServer() {
    if (
      this.koishiModuleOptions.httpAdapter &&
      !this.koishiModuleOptions.port
    ) {
      const httpServer: Server = this.koishiModuleOptions.httpAdapter.getHttpServer();
      if (httpServer instanceof Server) {
        this.logger('app').info('App using Nest HTTP Server.');
        this._httpServer = httpServer;
      }
    }
  }

  onModuleInit() {
    this.setHttpServer();
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
}
