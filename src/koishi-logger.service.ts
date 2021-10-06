import {
  ConsoleLogger,
  Inject,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { Logger } from 'koishi';
import { KOISHI_MODULE_OPTIONS } from './koishi.constants';
import { KoishiModuleOptions } from './koishi.interfaces';

@Injectable()
export class KoishiLoggerService extends ConsoleLogger {
  constructor(@Inject(KOISHI_MODULE_OPTIONS) options: KoishiModuleOptions) {
    super(options.loggerPrefix || 'koishi');
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const _this = this;
    Logger.targets = [
      {
        colors: 3,
        print(text: string) {
          const header = text.slice(0, 4);
          const body = text.slice(4);
          switch (header) {
            case '[S] ':
            case '[I] ':
              _this.log(body);
              break;
            case '[W] ':
              _this.warn(body);
              break;
            case '[E] ':
              _this.error(body);
              break;
            case '[D] ':
              _this.debug(body);
              break;
            default:
              _this.log(text);
              break;
          }
        },
      },
    ];
  }
}
