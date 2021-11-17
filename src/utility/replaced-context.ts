import { Argv, Command, Context, Plugin, Session } from 'koishi';
import { KoishiService } from '../koishi.service';
import { KoishiCommandInterceptorRegistration } from './koishi.interfaces';

export type Filter = (session: Session) => boolean;

export class ReplacedContext extends Context {
  constructor(
    private _filter: Filter,
    private _app: KoishiService,
    private __plugin: Plugin = null,
    public _interceptors: KoishiCommandInterceptorRegistration[] = [],
  ) {
    super(_filter, _app, __plugin);
  }

  private cloneContext(
    filter: Filter,
    interceptors: KoishiCommandInterceptorRegistration[] = [],
  ): Context {
    return new ReplacedContext(filter, this._app, this.__plugin, [
      ...this._interceptors,
      ...interceptors,
    ]);
  }

  withInterceptors(interceptors: KoishiCommandInterceptorRegistration[]) {
    return this.cloneContext(this.filter, interceptors);
  }

  override any() {
    return this.cloneContext(() => true);
  }

  override never() {
    return this.cloneContext(() => false);
  }

  override union(arg: Filter | Context) {
    const filter = typeof arg === 'function' ? arg : arg.filter;
    return this.cloneContext((s) => this.filter(s) || filter(s));
  }

  override intersect(arg: Filter | Context) {
    const filter = typeof arg === 'function' ? arg : arg.filter;
    return this.cloneContext((s) => this.filter(s) && filter(s));
  }

  override except(arg: Filter | Context) {
    const filter = typeof arg === 'function' ? arg : arg.filter;
    return this.cloneContext((s) => this.filter(s) && !filter(s));
  }

  override command<D extends string>(
    def: D,
    config?: Command.Config,
  ): Command<never, never, Argv.ArgumentType<D>>;
  override command<D extends string>(
    def: D,
    desc: string,
    config?: Command.Config,
  ): Command<never, never, Argv.ArgumentType<D>>;
  override command(
    def: string,
    ...args: [Command.Config?] | [string, Command.Config?]
  ) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const cmd = super.command(def, ...args);
    this._app.addInterceptors(cmd, this._interceptors);
    return cmd;
  }
}
