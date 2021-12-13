import { Test } from '@nestjs/testing';
import { KoishiModule } from '../src/koishi.module';
import { KoishiService } from '../src/koishi.service';
import { INestApplication } from '@nestjs/common';
import { KoishiWsAdapter } from '../src/koishi.ws-adapter';
import http from 'http';
import request from 'supertest';

describe('HttpServer', () => {
  let app: INestApplication;
  let koishiApp: KoishiService;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [
        KoishiModule.register({
          useWs: true,
        }),
      ],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useWebSocketAdapter(new KoishiWsAdapter(app));
    await app.init();
    koishiApp = app.get(KoishiService);
  });

  it('should define koishi', () => {
    expect(koishiApp).toBeDefined();
  });

  it('should register http and ws server', () => {
    expect(koishiApp._httpServer).toBeDefined();
    expect(koishiApp._wsServer).toBeDefined();
  });

  it('should be nest http server', () => {
    expect(koishiApp._httpServer).toBeInstanceOf(http.Server);
    expect(app.getHttpServer()).toEqual(koishiApp._httpServer);
  });
  it('should response to koishi routes', () => {
    koishiApp.router.get('/ping', (ctx) => {
      ctx.status = 233;
      ctx.body = 'pong';
    });
    return request(app.getHttpServer()).get('/ping').expect(233).expect('pong');
  });
});
