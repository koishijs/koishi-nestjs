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
import { KoishiCommandInterceptor } from '../src/utility/koishi.interfaces';
import { Argv } from 'koishi';
import { CommandInterceptors } from '../src/utility/koishi.decorators';

@Injectable()
class MooInterceptor implements KoishiCommandInterceptor {
  intercept(argv: Argv) {
    return 'moo!';
  }
}

@Injectable()
class PooInterceptor implements KoishiCommandInterceptor {
  intercept(argv: Argv) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (argv.options?.content === 'poo') {
      return 'poo!';
    }
  }
}

@Injectable()
class PeeInterceptor implements KoishiCommandInterceptor {
  intercept(argv: Argv) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (argv.options?.content === 'pee') {
      return 'pee!';
    }
  }
}

@OnPlatform('discord')
@Injectable()
@CommandInterceptors(PooInterceptor)
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

  @UseCommand('moo')
  @CommandInterceptors(MooInterceptor)
  async onMoo() {
    return 'zzzz';
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
          globalInterceptors: [PeeInterceptor],
        }),
      ],
      providers: [
        KoishiTestService,
        MooInterceptor,
        PooInterceptor,
        PeeInterceptor,
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
    expect(command).toBeDefined();
    expect(command.execute({ options: { content: 'bow!' } })).resolves.toBe(
      'boo: bow!',
    );
  });

  it('should handle unknown error', () => {
    const command = koishiApp.command('bow');
    expect(command).toBeDefined();
    expect(command.execute({ options: { content: 'bow!' } })).resolves.toBe(
      'Internal Server Error',
    );
  });

  it('should intercept on specific method', () => {
    const command = koishiApp.command('moo');
    expect(command).toBeDefined();
    expect(command.execute({ options: {} })).resolves.toBe('moo!');
  });

  it('should intercept on service', async () => {
    const command = koishiApp.command('echo');
    expect(command).toBeDefined();
    expect(command.execute({ options: { content: 'poo' } })).resolves.toBe(
      'poo!',
    );
  });

  it('should intercept on global', () => {
    const command = koishiApp.command('echo');
    expect(command).toBeDefined();
    expect(command.execute({ options: { content: 'pee' } })).resolves.toBe(
      'pee!',
    );
  });
});
