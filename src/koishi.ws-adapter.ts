import { WsAdapter } from '@nestjs/platform-ws';
import { INestApplicationContext } from '@nestjs/common';
import * as http from 'http';

export class KoishiWsAdapter extends WsAdapter {
  constructor(appOrHttpServer?: INestApplicationContext | any) {
    super(appOrHttpServer);
  }

  override ensureHttpServerExists(
    port: number,
    httpServer = http.createServer(),
  ) {
    if (this.httpServersRegistry.has(port)) {
      return;
    }
    this.httpServersRegistry.set(port, httpServer);

    httpServer.on('upgrade', (request, socket, head) => {
      const baseUrl = 'ws://' + request.headers.host + '/';
      const pathname = new URL(request.url, baseUrl).pathname;
      const wsServersCollection = this.wsServersRegistry.get(port);

      let isRequestDelegated = false;
      let fallbackWsServer: any;
      for (const wsServer of wsServersCollection) {
        if (pathname === wsServer.path) {
          wsServer.handleUpgrade(request, socket, head, (ws: unknown) => {
            wsServer.emit('connection', ws, request);
          });
          isRequestDelegated = true;
          break;
        }
        if (wsServer.path === '__koishi_fallback') {
          fallbackWsServer = wsServer;
        }
      }
      if (!isRequestDelegated && fallbackWsServer) {
        const wsServer = fallbackWsServer;
        wsServer.handleUpgrade(request, socket, head, (ws: unknown) => {
          wsServer.emit('connection', ws, request);
        });
        isRequestDelegated = true;
      }
      if (!isRequestDelegated) {
        socket.destroy();
      }
    });
    return httpServer;
  }
}
