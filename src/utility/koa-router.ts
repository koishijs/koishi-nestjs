import KoaRouter from '@koa/router';
import { Context, MaybeArray, remove, WebSocketLayer } from 'koishi';
import { IncomingMessage } from 'http';
import WebSocket from 'ws';

export class KoishiNestRouter extends KoaRouter {
  wsStack: WebSocketLayer[] = [];

  /**
   * hack into router methods to make sure that koa middlewares are disposable
   */
  override register(...args: Parameters<KoaRouter['register']>) {
    const layer = super.register(...args);
    const context: Context = this[Context.current];
    context?.state.disposables.push(() => {
      remove(this.stack, layer);
    });
    return layer;
  }

  ws(
    path: MaybeArray<string | RegExp>,
    callback?: (socket: WebSocket, request: IncomingMessage) => void,
  ) {
    const layer = new WebSocketLayer(this, path, callback);
    this.wsStack.push(layer);
    const context: Context = this[Context.current];
    context?.state.disposables.push(() => layer.close());
    return layer;
  }
}
