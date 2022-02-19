import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { KoishiService } from '../src/koishi.service';
import { testingModule } from './utility/testing-module';
import { KoishiWsAdapter } from '../src/koishi.ws-adapter';
import http from 'http';
import request from 'supertest';

describe('Koishi module in Fastify adapter', () => {
  let app: NestFastifyApplication;
  let koishiApp: KoishiService;

  beforeEach(async () => {
    const moduleFixture = await testingModule();
    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
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
    return app.inject({ method: 'GET', url: '/ping/?test=1' }).then((res) => {
      expect(res.statusCode).toBe(233);
      expect(res.body).toBe('pong');
    });
  });
});
