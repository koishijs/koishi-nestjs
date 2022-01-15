import { App, Argv, Command, Context, Router } from 'koishi';
import {
  Inject,
  Injectable,
  OnApplicationBootstrap,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  KoishiCommandInterceptorRegistration,
  KoishiModuleOptions,
} from './utility/koishi.interfaces';
import { Server } from 'http';
import Koa from 'koa';
import KoaBodyParser from 'koa-bodyparser';
import { KoishiMetascanService } from './providers/koishi-metascan.service';
import { applySelector } from './utility/koishi.utility';
import { KOISHI_MODULE_OPTIONS } from './utility/koishi.constants';
import { KoishiLoggerService } from './providers/koishi-logger.service';
import { KoishiHttpDiscoveryService } from './koishi-http-discovery/koishi-http-discovery.service';
import { Filter, ReplacedContext } from './utility/replaced-context';

// eslint-disable-next-line @typescript-eslint/no-empty-function
Router.prepare = () => {};

@Injectable()
export class KoishiService
  extends App
  implements OnModuleInit, OnApplicationBootstrap, OnModuleDestroy
{
  private readonly globalInterceptors: KoishiCommandInterceptorRegistration[];
  constructor(
    @Inject(KOISHI_MODULE_OPTIONS)
    private readonly koishiModuleOptions: KoishiModuleOptions,
    private readonly metascan: KoishiMetascanService,
    private readonly httpDiscovery: KoishiHttpDiscoveryService,
    private readonly koishiLogger: KoishiLoggerService,
  ) {
    super({
      ...koishiModuleOptions,
      port: 1,
    });
    this.baseDir ??= process.cwd();
    this.globalInterceptors = this.koishiModuleOptions.globalInterceptors || [];
    this.router = new Router();
    this._nestKoaTmpInstance.use(KoaBodyParser());
    this._nestKoaTmpInstance.use(this.router.routes());
    this._nestKoaTmpInstance.use(this.router.allowedMethods());
  }

  readonly _nestKoaTmpInstance = new Koa();

  override async start() {
    this.isActive = true;
    await this.parallel('ready');
    this.logger('app').debug('started');
  }

  private async setHttpServer() {
    const httpAdapter = this.httpDiscovery.getHttpAdapter();
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

  addInterceptors(
    command: Command,
    interceptorDefs: KoishiCommandInterceptorRegistration[],
  ) {
    return this.metascan.addInterceptors(command, interceptorDefs);
  }

  private cloneContext(
    filter: Filter,
    interceptors: KoishiCommandInterceptorRegistration[] = [],
  ): Context {
    return new ReplacedContext(filter, this, null, [
      ...this.globalInterceptors,
      ...interceptors,
    ]);
  }

  withInterceptors(interceptors: KoishiCommandInterceptorRegistration[]) {
    return this.cloneContext(() => true, interceptors);
  }

  override any() {
    return this.cloneContext(() => true);
  }

  override never() {
    return this.cloneContext(() => false);
  }

  override union(arg: Filter | Context) {
    const filter = typeof arg === 'function' ? arg : arg.filter;
    return this.cloneContext((s) => this.filter(s) || filter(s));
  }

  override intersect(arg: Filter | Context) {
    const filter = typeof arg === 'function' ? arg : arg.filter;
    return this.cloneContext((s) => this.filter(s) && filter(s));
  }

  override except(arg: Filter | Context) {
    const filter = typeof arg === 'function' ? arg : arg.filter;
    return this.cloneContext((s) => this.filter(s) && !filter(s));
  }

  override command<D extends string>(
    def: D,
    config?: Command.Config,
  ): Command<never, never, Argv.ArgumentType<D>>;
  override command<D extends string>(
    def: D,
    desc: string,
    config?: Command.Config,
  ): Command<never, never, Argv.ArgumentType<D>>;
  override command(
    def: string,
    ...args: [Command.Config?] | [string, Command.Config?]
  ) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const cmd = super.command(def, ...args);
    this.addInterceptors(cmd, this.globalInterceptors);
    return cmd;
  }
}
