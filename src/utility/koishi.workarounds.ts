import { Command, Commander, Context } from 'koishi';
import { KoishiService } from '../koishi.service';
import { KoishiCommandInterceptorRegistration } from './koishi.interfaces';

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

export class IntercepterManagerService {
  constructor(private ctx: Context) {}
  protected get caller(): Context {
    return this[Context.current] || this.ctx;
  }

  withInterceptors(
    interceptors: KoishiCommandInterceptorRegistration[],
  ): Context {
    const ctx = this.caller;
    return ctx['fork']({
      interceptors: [...(ctx.interceptors || []), ...interceptors],
    });
  }
}

Context.service('$interceptorManager', {
  constructor: IntercepterManagerService,
  methods: ['withInterceptors'],
});
