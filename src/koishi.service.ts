import { App } from 'koishi';
import {
  Inject,
  Injectable,
  OnApplicationBootstrap,
  OnModuleInit,
} from '@nestjs/common';
import { KOISHI_MODULE_OPTIONS } from './koishi.constants';
import { KoishiModuleOptions } from './koishi.interfaces';

@Injectable()
export class KoishiService
  extends App
  implements OnModuleInit, OnApplicationBootstrap {
  constructor(
    @Inject(KOISHI_MODULE_OPTIONS)
    private koishiModuleOptions: KoishiModuleOptions,
  ) {
    super(koishiModuleOptions);
  }

  onModuleInit() {
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
