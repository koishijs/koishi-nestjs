import {
  DynamicModule,
  Module,
  OnApplicationShutdown,
  Provider,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  KoishiModuleAsyncOptions,
  KoishiModuleOptions,
  KoishiModuleOptionsFactory,
} from './koishi.interfaces';
import { KoishiService } from './koishi.service';
import {
  KOISHI_CONTEXT,
  KOISHI_CONTEXT_CHANNEL,
  KOISHI_CONTEXT_PRIVATE,
  KOISHI_MODULE_OPTIONS,
} from './koishi.constants';
const koishiContextProviderAny: Provider = {
  provide: KOISHI_CONTEXT,
  useFactory: (koishiApp: KoishiService) => koishiApp.any(),
};

const koishiContextProviderChannel: Provider = {
  provide: KOISHI_CONTEXT_CHANNEL,
  useFactory: (koishiApp: KoishiService) => koishiApp.channel(),
};

const koishiContextProviderPrivate: Provider = {
  provide: KOISHI_CONTEXT_PRIVATE,
  useFactory: (koishiApp: KoishiService) => koishiApp.private(),
};

@Module({
  providers: [
    KoishiService,
    koishiContextProviderAny,
    koishiContextProviderChannel,
    koishiContextProviderPrivate,
  ],
  exports: [
    KoishiService,
    koishiContextProviderAny,
    koishiContextProviderChannel,
    koishiContextProviderPrivate,
  ],
})
export class KoishiModule implements OnApplicationShutdown {
  constructor(private readonly moduleRef: ModuleRef) {}

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

  async onApplicationShutdown() {
    const koishiApp = this.moduleRef.get(KoishiService);
    await koishiApp.stop();
  }
}
