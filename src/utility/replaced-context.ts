import { Context, Plugin, Session } from 'koishi';
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
    plugin: Plugin,
    interceptors: KoishiCommandInterceptorRegistration[],
  ): Context {
    return new ReplacedContext(filter, this._app, plugin, interceptors);
  }

  withInterceptors(interceptors: KoishiCommandInterceptorRegistration[]) {
    return this.cloneContext(this.filter, this.plugin, [
      ...this._interceptors,
      ...interceptors,
    ]);
  }

  override fork(filter: Filter, _plugin: Plugin) {
    return this.cloneContext(filter, _plugin, this._interceptors);
  }
}
