import { App, Command } from 'koishi';
import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  KoishiCommandInterceptorRegistration,
  KoishiModuleOptions,
} from './utility/koishi.interfaces';
import { createServer, Server } from 'http';
import Koa from 'koa';
import KoaBodyParser from 'koa-bodyparser';
import { KoishiMetascanService } from './providers/koishi-metascan.service';
import { KOISHI_MODULE_OPTIONS, KoishiIpSym } from './utility/koishi.constants';
import { KoishiLoggerService } from './providers/koishi-logger.service';
import { KoishiHttpDiscoveryService } from './koishi-http-discovery/koishi-http-discovery.service';
import { applySelector } from 'koishi-decorators';
import WebSocket from 'ws';
import { KoishiNestRouter } from './utility/koa-router';
import './utility/koishi.workarounds';
import './utility/koishi.declares';

@Injectable()
export class KoishiService
  extends App
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
    this.router = new KoishiNestRouter();
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
      this._httpServer = httpServer;
    } else {
      this.logger('app').info('No http adapters found from Nest application.');
      this._httpServer = createServer(this._nestKoaTmpInstance.callback());
      this._wsServer = new WebSocket.Server({
        server: this._httpServer,
      });

      this._wsServer.on('connection', (socket, request) => {
        for (const manager of this.router.wsStack) {
          if (manager.accept(socket, request)) return;
        }
        socket.close();
      });
    }
  }

  async onModuleInit() {
    await this.setHttpServer();
    this.metascan.preRegisterContext(this.any());
    if (this.koishiModuleOptions.usePlugins) {
      for (const pluginDef of this.koishiModuleOptions.usePlugins) {
        const ctx = applySelector(this, pluginDef);
        ctx.plugin(pluginDef.plugin, pluginDef.options);
      }
    }
    await this.metascan.registerContext(this.any());
    return this.start();
  }

  async onModuleDestroy() {
    await this.stop();
  }

  addInterceptors(
    command: Command,
    interceptorDefs: KoishiCommandInterceptorRegistration[],
  ) {
    return this.metascan.addInterceptors(command, interceptorDefs);
  }
}
