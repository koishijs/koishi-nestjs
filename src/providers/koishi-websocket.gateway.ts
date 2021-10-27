import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { KoishiService } from '../koishi.service';
import type WebSocket from 'ws';
import type { Server } from 'ws';
import { IncomingMessage } from 'http';

@WebSocketGateway()
export class KoishiWebsocketGateway
  implements OnGatewayInit, OnGatewayConnection {
  constructor(private readonly koishi: KoishiService) {}

  @WebSocketServer()
  wsServer: Server;

  afterInit(server: any): any {
    // console.log('Init ws server', server, server === this.wsServer);
    this.wsServer.path = '__koishi_fallback';
    this.koishi._wsServer = this.wsServer;
  }

  handleConnection(socket: WebSocket, request: IncomingMessage) {
    // console.log(socket);
    for (const manager of this.koishi.router.wsStack) {
      if (manager.accept(socket, request)) return;
    }
    socket.close();
  }
}
