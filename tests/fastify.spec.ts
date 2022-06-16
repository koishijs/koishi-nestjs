import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { KoishiService } from '../src/koishi.service';
import { testingModule } from './utility/testing-module';
import { KoishiWsAdapter } from '../src/koishi.ws-adapter';
import http from 'http';
import { Context } from 'koishi';

describe('Koishi module in Fastify adapter', () => {
  let app: NestFastifyApplication;
  let koishiApp: KoishiService;

  beforeEach(async () => {
    const moduleFixture = await testingModule();
    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter({
        trustProxy: true,
      }),
    );
    app.useWebSocketAdapter(new KoishiWsAdapter(app));
    Context.service('ping');
    koishiApp = app.get(KoishiService);
    koishiApp['ping'] = { ping: 'pong' };
    await app.init();
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

  it('should response to koishi routes', () => {
    koishiApp.router.get('/ip', (ctx) => {
      ctx.status = 233;
      ctx.body = ctx.ip;
    });
    return app
      .inject({
        method: 'GET',
        url: '/ip',
        headers: { 'x-forwarded-for': '1.1.1.1' },
      })
      .then((res) => {
        expect(res.statusCode).toBe(233);
        expect(res.body).toBe('1.1.1.1');
      });
  });
});
