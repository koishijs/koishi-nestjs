import { Injectable } from '@nestjs/common';
import {
  AbstractHttpAdapter,
  HttpAdapterHost,
  MetadataScanner,
  ModuleRef,
  ModulesContainer,
  Reflector,
} from '@nestjs/core';
import { Argv, Command, Context } from 'koishi';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import {
  KoishiCommandDefinition,
  KoishiDoRegister,
  KoishiOnContextScope,
  KoishiServiceProvideSym,
  KoishiServiceWireKeys,
  KoishiServiceWireProperty,
} from '../utility/koishi.constants';
import {
  CommandDefinitionFun,
  CommandPutConfig,
  ContextFunction,
  DoRegisterConfig,
  EventName,
  EventNameAndPrepend,
  KoishiModulePlugin,
  OnContextFunction,
} from '../koishi.interfaces';
import { applySelector } from '../utility/koishi.utility';
import _ from 'lodash';
import { KoishiContextService } from './koishi-context.service';
import { Module } from '@nestjs/core/injector/module';

@Injectable()
export class KoishiMetascanService {
  constructor(
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
    private readonly moduleRef: ModuleRef,
    private readonly moduleContainer: ModulesContainer,
    private readonly ctxService: KoishiContextService,
  ) {}

  getHttpAdapter(): AbstractHttpAdapter {
    const apdaterHost = this.moduleRef.get(HttpAdapterHost, { strict: false });
    if (apdaterHost) {
      return apdaterHost.httpAdapter;
    } else {
      return null;
    }
  }

  private getCommandActionArg(
    config: CommandPutConfig,
    argv: Argv,
    args: any[],
  ) {
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
      default:
        return undefined;
    }
  }

  private async handleInstanceRegistration(
    ctx: Context,
    instance: Record<string, any>,
    methodKey: string,
  ) {
    const methodFun: (...args: any[]) => any = instance[methodKey];
    const regData: DoRegisterConfig = this.reflector.get(
      KoishiDoRegister,
      methodFun,
    );
    if (!regData) {
      return;
    }
    let baseContext = ctx;
    const instanceContextFilters: OnContextFunction[] = this.reflector.get(
      KoishiOnContextScope,
      instance.constructor,
    );
    if (instanceContextFilters) {
      for (const filter of instanceContextFilters) {
        baseContext = filter(baseContext) || baseContext;
      }
    }
    const methodContextFilters: OnContextFunction[] = this.reflector.get(
      KoishiOnContextScope,
      methodFun,
    );
    if (methodContextFilters) {
      for (const filter of methodContextFilters) {
        baseContext = filter(baseContext) || baseContext;
      }
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
        const commandDefs: CommandDefinitionFun[] = this.reflector.get(
          KoishiCommandDefinition,
          methodFun,
        );
        if (commandDefs) {
          for (const commandDef of commandDefs) {
            command = commandDef(command) || command;
          }
        }
        if (!commandData.putOptions) {
          command.action((argv: Argv, ...args: any[]) =>
            methodFun.call(instance, argv, ...args),
          );
        } else {
          for (const _optionToRegister of commandData.putOptions) {
            if (_optionToRegister.type !== 'option') {
              continue;
            }
            const optionToRegister = _optionToRegister as CommandPutConfig<'option'>;
            command.option(
              optionToRegister.data.name,
              optionToRegister.data.desc,
              optionToRegister.data.config,
            );
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
    const providingServiceNames: string[] = this.reflector.get(
      KoishiServiceProvideSym,
      instance.constructor,
    );
    if (providingServiceNames) {
      for (const name of providingServiceNames) {
        ctx[name] = instance;
      }
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
