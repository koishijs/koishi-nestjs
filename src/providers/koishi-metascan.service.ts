import { Inject, Injectable } from '@nestjs/common';
import { MetadataScanner, ModuleRef, ModulesContainer } from '@nestjs/core';
import { Argv, Command, Context, User } from 'koishi';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import {
  KOISHI_MODULE_OPTIONS,
  KoishiCommandDefinition,
  KoishiCommandInterceptorDef,
  KoishiDoRegister,
  KoishiOnContextScope,
  KoishiServiceProvideSym,
  KoishiServiceWireKeys,
  KoishiServiceWireProperty,
} from '../utility/koishi.constants';
import {
  CommandPutConfig,
  DoRegisterConfig,
  EventName,
  KoishiCommandInterceptorRegistration,
  KoishiModuleOptions,
  KoishiModulePlugin,
} from '../utility/koishi.interfaces';
import { applySelector } from '../utility/koishi.utility';
import _ from 'lodash';
import { KoishiContextService } from './koishi-context.service';
import { Module } from '@nestjs/core/injector/module';
import { KoishiMetadataFetcherService } from '../koishi-metadata-fetcher/koishi-metadata-fetcher.service';
import { KoishiInterceptorManagerService } from '../koishi-interceptor-manager/koishi-interceptor-manager.service';

@Injectable()
export class KoishiMetascanService {
  constructor(
    private readonly metadataScanner: MetadataScanner,
    private readonly moduleRef: ModuleRef,
    private readonly moduleContainer: ModulesContainer,
    private readonly ctxService: KoishiContextService,
    private readonly metaFetcher: KoishiMetadataFetcherService,
    @Inject(KOISHI_MODULE_OPTIONS)
    private readonly koishiModuleOptions: KoishiModuleOptions,
    private readonly intercepterManager: KoishiInterceptorManagerService,
  ) {}

  private preRegisterCommandActionArg(config: CommandPutConfig, cmd: Command) {
    if (!config) {
      return;
    }
    switch (config.type) {
      case 'option':
        const { data: optionData } = config as CommandPutConfig<'option'>;
        cmd.option(optionData.name, optionData.desc, optionData.config);
        break;
      case 'user':
        const { data: userFields } = config as CommandPutConfig<'user'>;
        if (userFields) {
          cmd.userFields(userFields);
        }
        break;
      case 'channel':
        const { data: channelFields } = config as CommandPutConfig<'channel'>;
        if (channelFields) {
          cmd.channelFields(channelFields);
        }
        break;
      case 'username':
        const { data: useDatabase } = config as CommandPutConfig<'username'>;
        if (useDatabase) {
          cmd.userFields(['name']);
        }
        break;
      default:
        break;
    }
    return;
  }

  private getCommandActionArg(
    config: CommandPutConfig,
    argv: Argv,
    args: any[],
  ) {
    if (!config) {
      return;
    }
    switch (config.type) {
      case 'arg':
        const { data: index } = config as CommandPutConfig<'arg'>;
        return args[index];
      case 'argv':
        return argv;
      case 'session':
        return argv.session;
      case 'option':
        const { data: optionData } = config as CommandPutConfig<'option'>;
        return argv.options[optionData.name];
      case 'user':
        return argv.session.user;
      case 'channel':
        return argv.session.channel;
      case 'username':
        const { data: useDatabase } = config as CommandPutConfig<'username'>;
        if (useDatabase) {
          const user = argv.session.user as User.Observed<'name'>;
          if (user?.name) {
            return user?.name;
          }
        }
        return argv.session.author?.nickname || argv.session.author?.username;
      case 'sessionField':
        const { data: field } = config as CommandPutConfig<'sessionField'>;
        return argv.session[field];
      default:
        return;
    }
  }

  addInterceptors(
    command: Command,
    interceptorDefs: KoishiCommandInterceptorRegistration[],
  ) {
    return this.intercepterManager.addInterceptors(command, interceptorDefs);
  }

  private async handleInstanceRegistration(
    ctx: Context,
    instance: Record<string, any>,
    methodKey: string,
  ) {
    const methodFun: (...args: any[]) => any = instance[methodKey];
    const regData = this.metaFetcher.getMetadata(KoishiDoRegister, methodFun);
    if (!regData) {
      return;
    }
    let baseContext = ctx;
    const contextFilters = this.metaFetcher.getPropertyMetadataArray(
      KoishiOnContextScope,
      instance,
      methodKey,
    );
    for (const filter of contextFilters) {
      baseContext = filter(baseContext) || baseContext;
    }
    switch (regData.type) {
      case 'middleware':
        const { data: midPrepend } = regData as DoRegisterConfig<'middleware'>;
        baseContext.middleware(
          (session, next) => methodFun.call(instance, session, next),
          midPrepend,
        );
        break;
      case 'onevent':
        const { data: eventData } = regData as DoRegisterConfig<'onevent'>;
        const eventName = eventData.name;
        baseContext.on(eventData.name, (...args: any[]) =>
          methodFun.call(instance, ...args),
        );
        // special events
        if (typeof eventName === 'string' && eventName.startsWith('service/')) {
          const serviceName = eventName.slice(8);
          if (baseContext[serviceName] != null) {
            methodFun.call(instance);
          }
        }
        break;
      case 'plugin':
        const pluginDesc: KoishiModulePlugin<any> = await methodFun.call(
          instance,
        );
        if (!pluginDesc || !pluginDesc.plugin) {
          throw new Error(`Invalid plugin from method ${methodKey}.`);
        }
        const pluginCtx = applySelector(baseContext, pluginDesc);
        pluginCtx.plugin(pluginDesc.plugin, pluginDesc.options);
        break;
      case 'command':
        const { data: commandData } = regData as DoRegisterConfig<'command'>;
        let command = baseContext.command(
          commandData.def,
          commandData.desc,
          commandData.config,
        );
        const commandDefs = this.metaFetcher.getMetadataArray(
          KoishiCommandDefinition,
          methodFun,
        );
        for (const commandDef of commandDefs) {
          command = commandDef(command) || command;
        }
        const interceptorDefs = _.uniq(
          this.metaFetcher.getPropertyMetadataArray(
            KoishiCommandInterceptorDef,
            instance,
            methodKey,
          ),
        );
        this.addInterceptors(command, interceptorDefs);
        if (!commandData.putOptions) {
          command.action((argv: Argv, ...args: any[]) =>
            methodFun.call(instance, argv, ...args),
          );
        } else {
          for (const _optionToRegister of commandData.putOptions) {
            this.preRegisterCommandActionArg(_optionToRegister, command);
          }
          command.action((argv: Argv, ...args: any[]) => {
            const params = commandData.putOptions.map((o) =>
              this.getCommandActionArg(o, argv, args),
            );
            return methodFun.call(instance, ...params);
          });
        }
        break;
      default:
        throw new Error(`Unknown operaton type ${regData.type}`);
    }
  }

  private registerOnService(
    ctx: Context,
    instance: any,
    property: string,
    name: string,
  ) {
    const preObject = ctx[name];
    if (preObject) {
      instance[property] = preObject;
    }
    ctx.on(
      <EventName>`service/${name}`,
      () => {
        instance[property] = ctx[name];
      },
      true,
    );
  }

  private scanInstanceForProvidingContextService(ctx: Context, instance: any) {
    const providingServiceNames = this.metaFetcher.getMetadataArray(
      KoishiServiceProvideSym,
      instance.constructor,
    );
    for (const name of providingServiceNames) {
      ctx[name] = instance;
    }
  }

  private scanInstanceForWireContextService(ctx: Context, instance: any) {
    const instanceClass = instance.constructor;
    const properties: string[] = Reflect.getMetadata(
      KoishiServiceWireKeys,
      instanceClass,
    );
    if (!properties) {
      return;
    }
    for (const property of properties) {
      const serviceName = Reflect.getMetadata(
        KoishiServiceWireProperty,
        instanceClass,
        property,
      );
      this.registerOnService(ctx, instance, property, serviceName);
    }
  }

  private getAllActiveProvidersFromModule(module: Module) {
    return [
      ...Array.from(module.routes.values()),
      ...Array.from(module.providers.values()),
    ]
      .filter((wrapper) => wrapper.isDependencyTreeStatic())
      .filter((wrapper) => wrapper.instance);
  }

  async preRegisterContext(ctx: Context) {
    for (const module of this.moduleContainer.values()) {
      const moduleCtx = this.ctxService.getModuleCtx(ctx, module);
      const allProviders = this.getAllActiveProvidersFromModule(module);
      for (const provider of allProviders) {
        const instance = provider.instance;
        this.scanInstanceForWireContextService(moduleCtx, instance);
        this.scanInstanceForProvidingContextService(moduleCtx, instance);
      }
    }
  }

  async registerContext(ctx: Context) {
    const modules = Array.from(this.moduleContainer.values());
    await Promise.all(
      _.flatten(
        modules.map((module) => {
          const moduleCtx = this.ctxService.getModuleCtx(ctx, module);
          const allProviders = this.getAllActiveProvidersFromModule(module);
          return allProviders.map((wrapper: InstanceWrapper) => {
            const { instance } = wrapper;
            const prototype = Object.getPrototypeOf(instance);
            return this.metadataScanner.scanFromPrototype(
              instance,
              prototype,
              (methodKey: string) =>
                this.handleInstanceRegistration(moduleCtx, instance, methodKey),
            );
          });
        }),
      ),
    );
  }
}
