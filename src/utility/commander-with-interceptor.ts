import { Command, Commander } from 'koishi';
import { ReplacedContext } from './replaced-context';
import { KoishiService } from '../koishi.service';

const oldCommand = Commander.prototype.command;
Commander.prototype.command = function (this: Commander, ...args: any[]) {
  const command: Command = oldCommand.call(this, ...args);
  const ctx = this.caller;
  const interceptors = (ctx as ReplacedContext)._interceptors;
  if (interceptors?.length) {
    (ctx.app as KoishiService).addInterceptors(command, interceptors);
  }
  return command;
};
