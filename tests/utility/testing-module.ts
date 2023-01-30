import { Injectable, NotFoundException } from '@nestjs/common';
import { KoishiCommandInterceptor } from '../../src/utility/koishi.interfaces';
import { Argv, Context, SessionError } from 'koishi';
import {
  CommandTemplate,
  CommandUsage,
  DefinePlugin,
  OnGuild,
  OnPlatform,
  PutOption,
  PutValue,
  RegisterSchema,
  SchemaProperty,
  StarterPlugin,
  UseCommand,
  UseEvent,
} from 'koishi-thirdeye';
import {
  CommandInterceptors,
  InjectContextUser,
  PluginDef,
  UsingService,
} from '../../src/utility/koishi.decorators';
import { Test } from '@nestjs/testing';
import { KoishiModule } from '../../src/koishi.module';
import { InjectContext } from '../../src/utility/koishi.decorators';

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
export class KoishiTestService {
  constructor(
    @InjectContext() public ctx1: Context,
    @InjectContextUser('111111111') public ctx2: Context,
  ) {}

  @OnGuild('1111111111')
  @UseCommand('echo', 'hi')
  @CommandUsage('foo')
  async onEcho(@PutOption('content', '-c <content>') content: string) {
    return `bot: ${content}`;
  }

  @UseCommand('boo')
  async onBoo(@PutOption('content', '-c <content>') content: string) {
    throw new NotFoundException(`boo: ${content}`);
  }

  @UseCommand('bow')
  async onBow() {
    throw new Error('bow!');
  }

  @UseCommand('hoo')
  @CommandTemplate('.hoo', 'hoo!')
  async onHoo() {
    throw new SessionError('.hoo');
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
}

@RegisterSchema()
class TestingPluginConfig {
  @SchemaProperty({ default: 'foo' })
  foo: string;
}

@DefinePlugin()
class TestingPlugin extends StarterPlugin(TestingPluginConfig) {
  @UseCommand('from-plugin')
  testingCommand() {
    return this.config.foo;
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
        usePlugins: [
          PluginDef(
            TestingPlugin,
            { foo: 'fooo' },
            {
              self: 'koishi',
            },
          ),
        ],
      }),
    ],
    providers: [
      KoishiTestService,
      MooInterceptor,
      PooInterceptor,
      PeeInterceptor,
    ],
    exports: [KoishiTestService],
  }).compile();
}
