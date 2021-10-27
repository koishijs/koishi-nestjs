import {
  DynamicModule,
  MiddlewareConsumer,
  Module,
  NestModule,
  Provider,
  Scope,
} from '@nestjs/common';
import {
  KoishiModuleAsyncOptions,
  KoishiModuleOptions,
  KoishiModuleOptionsFactory,
} from './koishi.interfaces';
import { KoishiService } from './koishi.service';
import {
  KOISHI_CONTEXT,
  KOISHI_MODULE_OPTIONS,
} from './utility/koishi.constants';
import { KoishiMiddleware } from './providers/koishi.middleware';
import { createServer } from 'http';
import { AddressInfo } from 'net';
import { KoishiLoggerService } from './providers/koishi-logger.service';
import { KoishiMetascanService } from './providers/koishi-metascan.service';
import { DiscoveryModule, INQUIRER } from '@nestjs/core';
import { Context } from 'koishi';
import { defaultContextContainer } from './koishi-context.factory';
import { KoishiInjectionService } from './providers/koishi-injection.service';
import { KoishiContextService } from './providers/koishi-context.service';
import { KoishiHttpDiscoveryService } from './koishi-http-discovery/koishi-http-discovery.service';
import { KoishiWebsocketGateway } from './providers/koishi-websocket.gateway';

const koishiContextProvider: Provider<Context> = {
  provide: KOISHI_CONTEXT,
  inject: [KoishiInjectionService, INQUIRER],
  scope: Scope.TRANSIENT,
  useFactory: (injectionService: KoishiInjectionService, inquirer: any) =>
    injectionService.getInjectContext(inquirer),
};

@Module({
  imports: [DiscoveryModule],
  providers: [
    KoishiService,
    KoishiLoggerService,
    KoishiMetascanService,
    koishiContextProvider,
    KoishiContextService,
    KoishiInjectionService,
    KoishiHttpDiscoveryService,
  ],
  exports: [KoishiService, koishiContextProvider],
})
export class KoishiModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(KoishiMiddleware).forRoutes('*');
  }

  static register(options: KoishiModuleOptions): DynamicModule {
    return {
      module: KoishiModule,
      providers: [
        { provide: KOISHI_MODULE_OPTIONS, useValue: options },
        ...defaultContextContainer.contextsToProvide,
        ...(options.useWs ? [KoishiWebsocketGateway] : []),
      ],
      exports: defaultContextContainer.contextsToProvide,
      global: options.isGlobal != null ? options.isGlobal : true,
    };
  }

  static registerAsync(options: KoishiModuleAsyncOptions): DynamicModule {
    return {
      module: KoishiModule,
      imports: options.imports,
      providers: [
        ...this.createAsyncProviders(options),
        ...defaultContextContainer.contextsToProvide,
        ...(options.extraProviders || []),
        ...(options.useWs ? [KoishiWebsocketGateway] : []),
      ],
      exports: defaultContextContainer.contextsToProvide,
      global: options.isGlobal != null ? options.isGlobal : true,
    };
  }

  private static createAsyncProviders(
    options: KoishiModuleAsyncOptions,
  ): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }
    return [
      this.createAsyncOptionsProvider(options),
      {
        provide: options.useClass,
        useClass: options.useClass,
      },
    ];
  }

  private static createAsyncOptionsProvider(
    options: KoishiModuleAsyncOptions,
  ): Provider {
    if (options.useFactory) {
      return {
        provide: KOISHI_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }
    return {
      provide: KOISHI_MODULE_OPTIONS,
      useFactory: async (optionsFactory: KoishiModuleOptionsFactory) =>
        optionsFactory.createKoishiOptions(),
      inject: [options.useExisting || options.useClass],
    };
  }
}
