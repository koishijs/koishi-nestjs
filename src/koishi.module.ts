import {
  DynamicModule,
  MiddlewareConsumer,
  Module,
  NestModule,
  Provider,
} from '@nestjs/common';
import {
  KoishiModuleAsyncOptions,
  KoishiModuleOptions,
  KoishiModuleOptionsFactory,
} from './koishi.interfaces';
import { KoishiService } from './koishi.service';
import {
  KOISHI_CONTEXT,
  KOISHI_CONTEXT_CHANNEL,
  KOISHI_CONTEXT_GUILD,
  KOISHI_CONTEXT_PRIVATE,
  KOISHI_MODULE_OPTIONS,
} from './koishi.constants';
import { KoishiMiddleware } from './koishi.middleware';
import { createServer } from 'http';
import { AddressInfo } from 'net';
import { KoishiLoggerService } from './koishi-logger.service';

const koishiContextProvider: Provider = {
  provide: KOISHI_CONTEXT,
  inject: [KoishiService],
  useFactory: (koishiApp: KoishiService) => koishiApp.any(),
};

const koishiContextProviderChannel: Provider = {
  provide: KOISHI_CONTEXT_CHANNEL,
  inject: [KoishiService],
  useFactory: (koishiApp: KoishiService) => koishiApp.channel(),
};

const koishiContextProviderGuild: Provider = {
  provide: KOISHI_CONTEXT_GUILD,
  inject: [KoishiService],
  useFactory: (koishiApp: KoishiService) => koishiApp.guild(),
};

const koishiContextProviderPrivate: Provider = {
  provide: KOISHI_CONTEXT_PRIVATE,
  inject: [KoishiService],
  useFactory: (koishiApp: KoishiService) => koishiApp.private(),
};

@Module({
  providers: [
    {
      provide: KoishiService,
      inject: [KOISHI_MODULE_OPTIONS],
      useFactory: async (options: KoishiModuleOptions) => {
        const koishi = new KoishiService(options);
        koishi._nestKoaTmpServer = createServer(
          koishi._nestKoaTmpInstance.callback(),
        );
        await new Promise<void>((resolve) => {
          koishi._nestKoaTmpServer.listen(0, 'localhost', resolve);
        });
        koishi._nestKoaTmpServerPort = (koishi._nestKoaTmpServer.address() as AddressInfo).port;
        return koishi;
      },
    },
    KoishiLoggerService,
    koishiContextProvider,
    koishiContextProviderChannel,
    koishiContextProviderGuild,
    koishiContextProviderPrivate,
    KoishiMiddleware,
  ],
  exports: [
    KoishiService,
    koishiContextProvider,
    koishiContextProviderChannel,
    koishiContextProviderGuild,
    koishiContextProviderPrivate,
  ],
})
export class KoishiModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(KoishiMiddleware).forRoutes('*');
  }

  static register(options: KoishiModuleOptions): DynamicModule {
    return {
      module: KoishiModule,
      providers: [{ provide: KOISHI_MODULE_OPTIONS, useValue: options }],
    };
  }

  static registerAsync(options: KoishiModuleAsyncOptions): DynamicModule {
    return {
      module: KoishiModule,
      imports: options.imports,
      providers: this.createAsyncProviders(options),
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
