# Koishi-Nest

[Nest.js](http://nestjs.com/) 下的 [Koishi](https://koishi.js.org) 模块。Koishi-Nest 在 Nest.js 下使用 Koishi 打造规模化的机器人应用。

目前只支持 Koishi v4 和 Nest v8 。

## 安装

```bash
npm install koishi-nestjs koishi@next proxy-agent
```

## 配置

### 同步

```ts
import { Module } from '@nestjs/common';
import { KoishiModule, PluginDef } from 'koishi-nestjs';
import PluginOnebot from '@koishijs/plugin-onebot';

@Module({
  imports: [
    KoishiModule.register({
      // 在这里填写 Koishi 配置参数
      prefix: '.',
      usePlugins: [
        // 预安装的插件
        PluginDef(PluginOnebot, {
      	  protocol: 'ws',
          endpoint: 'CQ_ENDPOINT',
          selfId: 'CQ_ENDPOINT',
          token: 'CQ_ENDPOINT',
        }),
      ],
    })
  ]
})
export class AppModule {}
```

### 异步

```ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { KoishiModule, PluginDef } from 'koishi-nestjs';
import PluginOnebot from '@koishijs/plugin-onebot';

@Module({
  imports: [
    KoishiModule.registerAsync({
      imports: [ConfigModule.forRoot()],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        // 在这里填写 Koishi 配置参数
        prefix: '.',
        usePlugins: [
          // 预安装的插件
          PluginDef(PluginOnebot, {
            protocol: 'ws',
            endpoint: config.get('CQ_ENDPOINT'),
            selfId: config.get('CQ_SELFID'),
            token: config.get('CQ_TOKEN'),
          }),
        ],
      })
    })
  ]
})
export class AppModule {}
```

### 配置项

Koishi-Nest 的配置项和 Koishi 配置项一致，参照 [Koishi 文档](https://koishi.js.org/v4/api/core/app.html#%E6%9E%84%E9%80%A0%E5%87%BD%E6%95%B0%E9%80%89%E9%A1%B9) 。下列配置项为 Koishi-Nest 特有的配置项。

* `loggerPrefix`: `string` Nest 日志中 Logger 的前缀。默认 `koishi` 。

* `loggerColor`: `number` Nest 日志中 Logger 的颜色支持。默认 `0` 。

* `usePlugins`: `KoishiModulePlugin[]` 可选。预先安装的 Koishi 插件列表。使用 `PluginDef(plugin, options, select)` 方法生成该项的定义。该配置项的成员参数如下。

  * `plugin` Koishi 插件。
  * `options` Koishi 插件配置。等同于 `ctx.plugin(plugin, options)`。
  * 上下文选择器见本文 **上下文选择器** 部分。

* `moduleSelection` `KoishiModuleSelection[]` 可选。选择 Nest 实例加载的其他 Nest 模块注入的 Koishi 上下文作用域，参数如下。

  * `module` Nest 模块名。
  * 上下文选择器见本文 **上下文选择器** 部分。
  
* `globalInterceptors` 全局命令拦截器，详见 **命令拦截器** 部分。

插件的使用可以参考 [Koishi 文档](https://koishi.js.org/v4/guide/plugin/plugin.html)。 `moduleSelection` 的使用见本文 **复用性** 部分。

* `useWs`: `boolean` 默认 `false` 。是否启用 WebSocket 。**异步配置该项应写入异步配置项中。** 详见本文的 **WebSocket** 部分。

* `isGlobal`: `boolean` 默认 `true` 。指示 Koishi-Nest 模块是否应被注册为全局模块，建议开启。当安装了其他模块的情况下，需要将 Koishi-Nest 注册为全局模块使得其他模块可以正常注入 Koishi-Nest 作为依赖项。 **异步配置该项应写入异步配置项中。** 关于全局模块请参考 [Nest.js 文档](https://docs.nestjs.cn/8/modules?id=%e5%85%a8%e5%b1%80%e6%a8%a1%e5%9d%97) 。

## WebSocket

Koishi-Nest 针对 Koishi 的 WebSocket 功能进行了针对 Nest.js 的适配。

若要使用 Koishi 的与 WebSocket 服务器相关的插件或功能，需要在 Koishi-Nest 配置项中，把 `useWs` 设置为 `true` ，并在 `main.ts` 修改下列部分。

```ts
  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new KoishiWsAdapter(app));
```

## 注入 Koishi 实例

可以直接注入 Koishi 实例或上下文进行注册操作。这种情况下，建议让 Nest 提供者实现 `OnModuleInit` 接口，并在该事件方法中进行 Koishi 指令注册操作。

Koishi-Nest 将在应用程序启动时启动 Koishi 实例。

### 注入完整 Koishi 实例

```ts
import { KoishiService } from 'koishi-nestjs';
import { Injectable, OnModuleInit } from '@nestjs/common';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(private koishi: KoishiService) {}

  onModuleInit() {
    this.koishi.on('message', (session) => {})
  }
}
```

### 注入上下文

```ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectContext } from 'koishi-nestjs';
import { Context } from 'koishi';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(@InjectContext() private ctx: Context) {}

  onModuleInit() {
    this.ctx.on('message', (session) => {})
  }
}
```

### 注入某一特定上下文

```ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectContextGuild } from 'koishi-nestjs';
import { Context } from 'koishi';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(@InjectContextGuild('1111111111') private ctx: Context) {}

  onModuleInit() {
    this.ctx.on('message', (session) => {})
  }
}
```

### 装饰器定义

在 Nest 提供者构造函数参数列表中使用下列装饰器即可进行注入操作。

* `@InjectContext()` 注入全体上下文。等价于 `ctx.any()`

* `@InjectContextPrivate(...values[]: string)` 注入私聊上下文。等价于 `ctx.private(...values)`

* `@InjectContextChannel(...values[]: string)` 注入频道上下文。等价于 `ctx.channel(...values)`

* `@InjectContextGuild(...values[]: string)` 注入群组上下文。等价于 `ctx.guild(...values)`

* `@InjectContextSelf(...values[]: string)` 注入机器人账户上下文。等价于 `ctx.self(...values)`

* `@InjectContextUser(...values[]: string)` 注入用户上下文。等价于 `ctx.user(...values)`

* `@InjectContextPlatform(...values[]: string)` 注入平台上下文。等价于 `ctx.platform(...values)`

### 在自定义提供者注入 Koishi 上下文

您将需要使用函数 `getContextProvideToken()` 进行注入操作，如下例。

```ts
import { Module } from '@nestjs/common';
import { KoishiModule, getContextProvideToken } from 'koishi-nestjs';
import { AppService } from './app.service';
import { Context } from 'koishi';

@Module({
  imports: [
    KoishiModule.register({...})
  ],
  providers: [
    {
      provide: AppService,
      inject: [getContextProvideToken()],
      useFactory: (ctx: Context) => new AppService(ctx)
    }
  ]
})
export class AppModule {}
```

#### 函数定义

`getContextProvideToken(scopeType?: ContextScopeTypes, values: string[] = [])`

* `scopeType` 作用域类型，可以是 `private` `channel` `guild` `self` `user` `platform` 之一。留空表示全局上下文。

* `values` 作用域值。例如 `getContextProvideToken('platform', ['onebot'])` 等价于 `ctx.platform('onebot')` .

## 使用装饰器注册 Koishi 指令

您也可以在完全不注入任何 Koishi 上下文的情况下注册 Koishi 指令，只需要在提供者类中使用装饰器即可。下面是一个例子。

```ts
@Injectable()
// 可以在提供者类中指定上下文选择器，等价于 `ctx.guild('111111111')`
@OnGuild('111111111')
export class AppService {
  // 等价于 `ctx.on('message', (session) => { })`
  @UseEvent('message')
  async onMessage(session: Session.Payload<'message'>) {
    console.log(`event ${session.userId}: ${session.content}`);
  }


  // 也可以在类成员方法中指定上下文选择器
  @OnPlatform('onebot')
  // 等价于 `ctx.middleware((session, next) => { })`
  @UseMiddleware(true)
  async onMiddleware(session: Session.Payload<'message'>, next: NextFunction) {
    console.log(`middleware ${session.userId}: ${session.content}`);
    next();
  }

  // 注册插件，可以异步注册插件
  @UsePlugin()
  async installPlugin() {
    const config = await someAsyncThings();
    return PluginDef(PluginCommon, config);
  }

  // 定义命令
  @UseCommand('my-echo <content:string>')
  @CommandDescription('Echo command from decorators!')
  @CommandUsage('Command usage')
  @CommandExample('Command example')
  testEchoCommand(@PutArgv() argv: Argv, @PutArg(0) content: string) {
    return content;
  }
}
```

### 装饰器定义

#### 选择器

选择器装饰器可以注册在提供者类，也可以注册在提供者方法函数。

选择器的使用请参照 [Koishi 文档](https://koishi.js.org/v4/guide/plugin/context.html#%E4%BD%BF%E7%94%A8%E9%80%89%E6%8B%A9%E5%99%A8) 。

* `@OnAnywhere()` 等价于 `ctx.any()`。
* 
* `@OnNowhere()` 等价于 `ctx.never()`。
* 
* `@OnUser(value)` 等价于 `ctx.user(value)`。

* `@OnSelf(value)` 等价于 `ctx.self(value)`。

* `@OnGuild(value)` 等价于 `ctx.guild(value)`。

* `@OnChannel(value)` 等价于 `ctx.channel(value)`。

* `@OnPlatform(value)` 等价于 `ctx.platform(value)`。

* `@OnPrivate(value)` 等价于 `ctx.private(value)`。

* `@OnSelection(value)` 等价于 `ctx.select(value)`。

* `@OnContext((ctx: Context) => Context)` 手动指定上下文选择器，用于 Koishi-Nest 不支持的选择器。例如，

```ts
@OnContext(ctx => ctx.platform('onebot'))
```

#### Koishi 注册

注册装饰器只能注册于提供者类方法中，如下。

* `@UseMiddleware(prepend?: boolean)` 注册中间件，等价于 `ctx.middleware((session, next) => { }, prepend)`。[参考](https://koishi.js.org/v4/guide/message/message.html#%E6%B3%A8%E5%86%8C%E5%92%8C%E5%8F%96%E6%B6%88%E4%B8%AD%E9%97%B4%E4%BB%B6)

* `@UseEvent(name: EventName, prepend?: boolean)` 注册事件监听器。等价于 `ctx.on(name, (session) => { }, prepend)`。[参考](https://koishi.js.org/v4/guide/plugin/lifecycle.html#%E4%BA%8B%E4%BB%B6%E7%B3%BB%E7%BB%9F)

* `@UsePlugin()` 使用该方法注册插件。在 Koishi 实例注册时该方法会自动被调用。该方法需要返回插件定义，可以使用 `PluginDef(plugin, options, select)` 方法生成。 [参考](https://koishi.js.org/v4/guide/plugin/plugin.html#%E5%AE%89%E8%A3%85%E6%8F%92%E4%BB%B6)

* `@UseCommand(def: string, desc?: string, config?: Command.Config)` 注册指令。指令系统可以参考 [Koishi 文档](https://koishi.js.org/guide/command.html) 。指令回调参数位置和类型和 Koishi 指令一致。

#### 指令描述装饰器

Koishi-Nest 使用一组装饰器进行描述指令的行为。这些装饰器需要和 `@UseCommand(def)` 一起使用。

* `@CommandDescription(text: string)` 指令描述。等价于 `ctx.command(def, desc)` 中的描述。

* `@CommandUsage(text: string)` 指令介绍。等价于 `cmd.usage(text)`。

* `@CommandExample(text: string)` 指令示例。等价于 `cmd.example(text)`。

* `@CommandAlias(def: string)` 指令别名。等价于 `cmd.alias(def)`。

* `@CommandShortcut(def: string, config?: Command.Shortcut)` 指令快捷方式。等价于 `cmd.shortcut(def, config)`。

* `@CommandDef((cmd: Command) => Command)` 手动定义指令信息，用于 Koishi-Nest 不支持的指令类型。

#### 指令参数

指令参数也使用一组装饰器对指令参数进行注入。下列装饰器应对提供者方法参数进行操作。

* `@PutArgv()` 注入 `Argv` 对象。

* `@PutSession(field?: keyof Session)` 注入 `Session` 对象，或 `Session` 对象的指定字段。

* `@PutArg(index: number)` 注入指令的第 n 个参数。

* `@PutOption(name: string, desc: string, config: Argv.OptionConfig = {})` 给指令添加选项并注入到该参数。等价于 `cmd.option(name, desc, config)` 。

* `@PutUser(fields: string[])` 添加一部分字段用于观测，并将 User 对象注入到该参数。

* `@PutChannel(fields: string[])` 添加一部分字段用于观测，并将 Channel 对象注入到该参数。

关于 Koishi 的观察者概念详见 [Koishi 文档](https://koishi.js.org/v4/guide/database/observer.html#%E8%A7%82%E5%AF%9F%E8%80%85%E5%AF%B9%E8%B1%A1) 。

* `@PutUserName(useDatabase: boolean = true)` 注入当前用户的用户名。
  * `useDatabase` 是否尝试从数据库获取用户名。
  
### 指令拦截器

和 Koishi 中的 [`command.before`](https://koishi.js.org/v4/guide/message/command.html#%E4%BD%BF%E7%94%A8%E6%A3%80%E6%9F%A5%E5%99%A8) 对应，Koishi-Nest 提供了**指令拦截器**，便于在指令运行之前进行一些操作，如参数检查，记录日志等。

#### 定义

指令拦截器需要实现 `KoishiCommandInterceptor` 接口，提供 `intercept` 方法。该方法的参数与 `command.before` 的回调函数一致。

> 不要将指令拦截器与 Nest.js 的拦截器混淆。

下面是一个指令拦截器的例子。

```ts
import { KoishiCommandInterceptor } from "koishi-nestjs";

export class MyCommandInterceptor implements KoishiCommandInterceptor {
  intercept(argv: Argv, arg1: string) {
    if(arg1.startsWith('foo')) {
      return 'Intercepted!';
    }
  }
}
```

#### 注册

要注册拦截器，只需要在指令对应的提供者方法或提供者本人使用 `@CommandInterceptors` 装饰器即可。也可以指定多个拦截器。

其中，在注册过拦截器的提供者类中，使用 `@InjectContext()` 或类似方法注入的上下文对象，也会应用拦截器。

> 这些上下文内安装的 Koishi 插件不会应用拦截器。 

```ts
import { InjectContext } from 'koishi-nestjs';
import { Context } from 'koishi';

@Injectable()
// 可以在提供者类中指定上下文选择器，等价于 `ctx.guild('111111111')`
@CommandInterceptors(MyGlobalInterceptor)
export class AppService {
  // 这里的 Koishi 上下文注册的任何指令也会应用拦截器
  constructor(@InjectContext() private ctx: Context) {}

  @UseCommand('my-echo <content:string>')
  @CommandInterceptors(MyInterceptor1, MyInterceptor2) // 可以指定多个拦截器。
  testEchoCommand(@PutArgv() argv: Argv, @PutArg(0) content: string) {
    return content;
  }
}
```

也可以在 Koishi-Nest 启动配置中，使用 `globalInterceptors` 方法注册拦截器。

## 上下文 Service 交互

您可以使用装饰器与 Koishi 的 Service 系统进行交互。

### 注入上下文 Service

注入的 Service 通常来自 Koishi 插件，或是自行提供的 Service 。

```ts
import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { WireContextService, UseEvent } from 'koishi-nestjs';
import { Cache } from 'koishi';

@Injectable()
export class AppService implements OnApplicationBootstrap {
  constructor(@InjectContextGuild('1111111111') private ctx: Context) {
  }

  // 注入 Service
  @WireContextService('cache')
  private cache2: Cache;

  // 成员变量名与 Service 名称一致时 name 可省略。
  @WireContextService()
  private cache: Cache;

  async onApplicationBootstrap() {
    // 可以在 onApplicationBootstrap 访问上下文 Service
    const user = this.cache.get('user', '111111111');
  }

  @UseEvent('service/cache')
  async onCacheAvailable() {
    // 建议监听 Service 事件
    const user = this.cache.get('user', '111111112');
  }
}
```

### 提供上下文 Service

您也可以使用 Nest 提供者提供 Koishi 需要的 Service 的实现。

```ts
import { Injectable } from '@nestjs/common';
import { ProvideContextService } from 'koishi-nestjs';

declare module 'koishi' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Context {
    interface Services {
      testProvide: TestProvideService;
    }
  }
}


// `@ProvideContextService(name)` 装饰器会自动完成 `Context.service(name)` 的声明操作
@Injectable()
@ProvideContextService('testProvide')
export class TestProvideService {
  // 该类会作为 Koishi 的 Service 供其他 Koishi 插件进行引用
}
```

### 定义

* `@WireContextService(name?: string)` 在 Nest 提供者类某一属性注入特定上下文 Service 。 `name` 默认为类方法名。

* `@ProvideContextService(name: string)` 使用某一 Nest 提供者类提供 Koishi 上下文 Service 。会自动完成 Koishi 的 Service 声明操作。

## 复用性

Nest 提供了模块系统，我们可以编写功能模块，并在功能模块进行 Koishi 指令注册操作，从而进行代码的有效复用。

### 编写模块

由于 Koishi-Nest 是全局定义的模块，功能模块 **不需要** 引入 `KoishiModule` 作为依赖。

> 功能模块中，请使用 `@InjectContext()` 注册上下文，避免直接注入 `KoishiService` 导致上下文泄漏。

```ts
import { Injectable, Module, OnModuleInit } from '@nestjs/common';
import {
  InjectContext,
  OnGuild,
  OnPlatform,
  OnUser,
  UseCommand,
} from 'koishi-nestjs';
import { Context } from 'koishi';

@Injectable()
export class MyService implements OnModuleInit {
  constructor(@InjectContext() private ctx: Context) {}
  onModuleInit(): any {
    this.ctx
      .command('my-echo2 <content:string>')
      .action((_, content) => content);
  }

  @OnPlatform('onebot')
  @UseCommand('my-echo3 <content:string>')
  onCommand3(_: any, content: string) {
    return content;
  }
}

@Module({
  // Koishi-Nestjs 默认定义为全局模块，因此不需要引入依赖
  imports: [],
  providers: [MyService],
})
export class MyModule {}
```
为了保证模块的可配置性，我们应该把模块编写为动态模块。关于动态模块的文档可以参照 [Nest.js 文档](https://docs.nestjs.cn/8/fundamentals?id=%e5%8a%a8%e6%80%81%e6%a8%a1%e5%9d%97) 。

### 使用模块

把要使用的模块填入 `imports` 内即可。

```ts
import { Module } from '@nestjs/common';
import { KoishiModule } from 'koishi-nestjs';

@Module({
  imports: [
    KoishiModule.register({
      // 在这里填写 Koishi 配置参数
      moduleSelection: [
        // 定义 MyModule 的 Koishi 指令注册只对 OneBot 平台有效
        { module: MyModule, select: { $platform: 'onebot' } }
      ]
    }),
    MyModule
  ]
})
export class AppModule {}
```

## 其他

### 上下文选择器

在 Koishi-Nest 中，选择器对象有下列定义，用于上下文的选择。

* `select`: 对象选择器，定义作用上下文。定义参照 [Koishi 文档](https://koishi.js.org/v4/guide/plugin/context.html#%E5%9C%A8%E9%85%8D%E7%BD%AE%E6%96%87%E4%BB%B6%E4%B8%AD%E4%BD%BF%E7%94%A8%E9%80%89%E6%8B%A9%E5%99%A8) 的写法。

* `useSelector`: `(ctx: Context) => Context` 使用函数进行选择。该函数接受1个 Context 参数，同时也需要返回1个 Context 对象。

### 帮助函数

* `PluginDef(plugin: Plugin, options?: PluginConfig, select?: Selection)` 生成指令注册定义。用于 Koishi-Nest 启动参数和 `@UsePlugin()` 返回值。指令注册定义成员参数如下。

  * `plugin`: Koishi 插件。
  * `options`: Koishi 插件配置。等同于 `ctx.plugin(plugin, options)`。
  * 上下文选择器见本文 **上下文选择器** 部分。

## 更新历史

### 2.2.1

* 和新版 Service API 兼容。

### 2.0.2

* `@ProvideContextService` 现在可以传入 Options 了。

### 2.0.1

* 优化了 Service 注入的一些逻辑。

### 2.0.0

* 适配 Koishi v4 beta 。

### 1.5.3

* 修复了一个 BUG ，这个 BUG 曾经导致: 在提供者类注入的 Koishi 上下文不受提供者作用域装饰器的约束。

### 1.5

* 增加了指令拦截器。

### 1.4.2

* `KoishiWsAdapter`: 支持正则表达式路径。

### 1.4

* 适配最新的 Koishi 版本的 Websocket 变动。 **使用涉及 Websocket 的 Koishi 插件需要使用附带的 `KoishiWsAdapter`。**

### 1.3.3

* 移除了 `http-proxy-middleware` 。
  
* 优化了 Nest 的 http 服务器与 Koishi 的 Koa 的对接过程。

### 1.3

* `@UseCommand` 现在定义和 Koishi 的指令定义，即 `ctx.command(name, desc, config)` 或 `ctx.command(name, config)` 一致了。

* 增加了 `@CommandUserFields` 对应 `cmd.userFields` 以及 `@CommandChannelFields` 对应 `cmd.channelFields` 。

* 增加了用于注入 Koishi 指令调用信息的提供者方法参数装饰器。详见 **指令参数** 部分。