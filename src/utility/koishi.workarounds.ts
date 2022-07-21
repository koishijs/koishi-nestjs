import { Command, Commander, Context } from 'koishi';
import { KoishiService } from '../koishi.service';
import { KoishiCommandInterceptorRegistration } from './koishi.interfaces';
import { StarterPlugin } from 'koishi-thirdeye/dist/src/registrar';
import { Caller, DefinePlugin, Internal, Provide } from 'koishi-thirdeye';

// command interceptor supports
const oldCommand = Commander.prototype.command;
Commander.prototype.command = function (this: Commander, ...args: any[]) {
  const command: Command = oldCommand.call(this, ...args);
  const ctx = this.caller;
  const interceptors = ctx.interceptors;
  if (interceptors?.length) {
    (ctx.app as KoishiService).addInterceptors(command, interceptors);
  }
  return command;
};

@Provide('$interceptorManager', { internal: true })
@DefinePlugin()
export class IntercepterManagerService extends StarterPlugin() {
  @Caller()
  caller: Context;

  @Internal()
  withInterceptors(
    interceptors: KoishiCommandInterceptorRegistration[],
  ): Context {
    const ctx = this.caller;
    return ctx.extend({
      interceptors: [...(ctx.interceptors || []), ...interceptors],
    });
  }
}
