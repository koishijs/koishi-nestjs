import { Injectable, NotFoundException } from '@nestjs/common';
import { KoishiCommandInterceptor } from '../../src/utility/koishi.interfaces';
import { Argv } from 'koishi';
import {
  CommandUsage,
  OnGuild,
  OnPlatform,
  PutOption,
  PutValue,
  UseCommand,
  UseEvent,
} from 'koishi-thirdeye';
import {
  CommandInterceptors,
  UsingService,
} from '../../src/utility/koishi.decorators';
import { Test } from '@nestjs/testing';
import { KoishiModule } from '../../src/koishi.module';

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

  @UseCommand('{{abstract.name}}')
  async onAbstract(@PutValue('{{abstract.content}}') content: string) {
    return content;
  }

  @UsingService('ping')
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  @UseEvent('ping')
  async onPing() {
    return 'pong';
  }
}

export function testingModule() {
  return Test.createTestingModule({
    imports: [
      KoishiModule.register({
        useWs: true,
        globalInterceptors: [PeeInterceptor],
        templateParams: {
          abstract: {
            name: 'mii',
            content: 'miiii',
          },
        },
      }),
    ],
    providers: [
      KoishiTestService,
      MooInterceptor,
      PooInterceptor,
      PeeInterceptor,
    ],
  }).compile();
}
