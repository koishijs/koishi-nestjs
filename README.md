# Koishi Nestjs

Koishi.js as NestModule

Only Koishi v4 is supported.

## Install

```bash
npm install koishi-nestjs koishi proxy-agent
```

## Configuration

### Sync

```ts
import { Module } from '@nestjs/common';
import { KoishiModule, PluginDef } from 'koishi-nestjs';
import PluginOnebot from '@koishijs/plugin-onebot';

@Module({
  imports: [
    KoishiModule.register({
      // Koishi config goes here
      usePlugins: [
        // Plugins to install
        PluginDef(PluginOnebot, {
      	  protocol: 'ws',
          endpoint: config.get('CQ_ENDPOINT'),
          selfId: config.get('CQ_SELFID'),
          token: config.get('CQ_TOKEN'),
        }),
      ],
    })
  ]
})
export class AppModule {}
```

You may also register Koishi plugins later.

### Async

```ts
import { Module } from '@nestjs/common';
import { KoishiModule, PluginDef } from 'koishi-nestjs';
import PluginOnebot from '@koishijs/plugin-onebot';

@Module({
  imports: [
    KoishiModule.registerAsync({
      useFactory: () => ({
        // Koishi config goes here
        usePlugins: [
          // Plugins to install
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

## Injection of Koishi App or Context

### Inject Koishi instance

```ts
import { KoishiService } from 'koishi-nestjs';

@Injectable()
export class AppService {
  constructor(private koishi: KoishiService) {}
}
```

### Inject Context

```ts
import { Injectable } from '@nestjs/common';
import { KoishiService, InjectContext } from 'koishi-nestjs';
import { Context } from 'koishi';

@Injectable()
export class AppService {
  constructor(@InjectContext() private ctx: Context) {}
}
```

### Inject Context of private chat

```ts
import { Injectable } from '@nestjs/common';
import { KoishiService, InjectContextPrivate } from 'koishi-nestjs';
import { Context } from 'koishi';

@Injectable()
export class AppService {
  constructor(@InjectContextPrivate() private ctx: Context) {}
}
```
### Inject Context of channel

```ts
import { Injectable } from '@nestjs/common';
import { KoishiService, InjectContextChannel } from 'koishi-nestjs';
import { Context } from 'koishi';

@Injectable()
export class AppService {
  constructor(@InjectContextChannel() private ctx: Context) {}
}
```
