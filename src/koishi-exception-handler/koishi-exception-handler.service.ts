import {
  ConsoleLogger,
  HttpException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { KOISHI_MODULE_OPTIONS } from '../utility/koishi.constants';
import { KoishiModuleOptions } from '../utility/koishi.interfaces';

@Injectable()
export class KoishiExceptionHandlerService extends ConsoleLogger {
  constructor(
    @Inject(KOISHI_MODULE_OPTIONS)
    private readonly koishiModuleOptions: KoishiModuleOptions,
  ) {
    super('KoishiExceptionHandler');
  }

  handleActionException(e: Error) {
    if (e instanceof HttpException || e instanceof WsException) {
      return e.message;
    } else {
      this.error(e.message, e.stack);
      if (this.koishiModuleOptions.actionErrorMessage === '') {
        return;
      }
      return (
        this.koishiModuleOptions.actionErrorMessage ?? 'Internal Server Error'
      );
    }
  }
}
