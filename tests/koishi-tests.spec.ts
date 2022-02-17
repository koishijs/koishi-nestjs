import { Test } from '@nestjs/testing';
import { KoishiModule } from '../src/koishi.module';
import { KoishiService } from '../src/koishi.service';
import {
  INestApplication,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { KoishiWsAdapter } from '../src/koishi.ws-adapter';
import http from 'http';
import request from 'supertest';
import {
  CommandUsage,
  OnGuild,
  OnPlatform,
  PutOption,
  UseCommand,
} from 'koishi-decorators';
import { Session } from 'koishi';

@OnPlatform('discord')
@Injectable()
class KoishiTestService {
  @OnGuild('1111111111')
  @UseCommand('echo', 'hi')
  @CommandUsage('foo')
  async onEcho(@PutOption('content', '-c <content:string>') content: string) {
    return `bot: ${content}`;
  }

  @UseCommand('boo')
  async onBoo(@PutOption('content', '-c <content:string>') content: string) {
    throw new NotFoundException(`boo: ${content}`);
  }

  @UseCommand('bow')
  async onBow() {
    throw new Error('bow!');
  }
}

describe('Koishi in Nest.js', () => {
  let app: INestApplication;
  let koishiApp: KoishiService;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [
        KoishiModule.register({
          useWs: true,
        }),
      ],
      providers: [KoishiTestService],
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

  it('should register command', () => {
    const command = koishiApp.command('echo');
    expect(command._usage).toBe('foo');
    expect(command._options.content.name).toBe('content');
    expect(command.execute({ options: { content: 'hello' } })).resolves.toBe(
      'bot: hello',
    );

    const correctSession = {
      guildId: '1111111111',
      platform: 'discord',
    } as Session;

    const wrongSession1 = {
      guildId: '2222222222',
      platform: 'discord',
    } as Session;

    const wrongSession2 = {
      guildId: '1111111111',
      platform: 'telegram',
    } as Session;

    const methodCtx = command.context;
    expect(methodCtx.filter(correctSession)).toBe(true);
    expect(methodCtx.filter(wrongSession1)).toBe(false);
    expect(methodCtx.filter(wrongSession2)).toBe(false);
  });

  it('should handle command error', () => {
    const command = koishiApp.command('boo');
    expect(command.execute({ options: { content: 'bow!' } })).resolves.toBe(
      'boo: bow!',
    );
  });

  it('should handle unknown error', () => {
    const command = koishiApp.command('bow');
    expect(command.execute({ options: { content: 'bow!' } })).resolves.toBe(
      'Internal Server Error',
    );
  });
});
