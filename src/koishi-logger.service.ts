import { ConsoleLogger, Inject, Injectable } from '@nestjs/common';
import { Logger } from 'koishi';
import { KOISHI_MODULE_OPTIONS } from './koishi.constants';
import { KoishiModuleOptions } from './koishi.interfaces';

@Injectable()
export class KoishiLoggerService extends ConsoleLogger {
  constructor(@Inject(KOISHI_MODULE_OPTIONS) options: KoishiModuleOptions) {
    super(options.loggerPrefix || 'koishi');
    Logger.targets = [
      {
        colors: 3,
        print: (text: string) => this.printKoishiLog(text),
      },
    ];
  }

  private printKoishiLog(text: string) {
    const header = text.slice(0, 4);
    const body = text.slice(4);
    switch (header) {
      case '[S] ':
      case '[I] ':
        this.log(body);
        break;
      case '[W] ':
        this.warn(body);
        break;
      case '[E] ':
        this.error(body);
        break;
      case '[D] ':
        this.debug(body);
        break;
      default:
        this.log(text);
        break;
    }
  }
}
