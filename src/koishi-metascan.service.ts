import { Injectable } from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { Argv, Command, Context } from 'koishi';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import {
  KoishiCommandDefinition,
  KoishiDoRegister,
  KoishiOnContextScope,
} from './koishi.constants';
import {
  CommandDefinitionFun,
  ContextFunction,
  DoRegisterConfig,
  EventNameAndPrepend,
  KoishiModulePlugin,
  OnContextFunction,
} from './koishi.interfaces';

@Injectable()
export class KoishiMetascanService {
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
  ) {}

  private async handleInstance(
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
    console.log(regData);
    switch (regData.type) {
      case 'middleware':
        baseContext.middleware(
          (session, next) => methodFun.call(instance, session, next),
          regData.data,
        );
        break;
      case 'onevent':
        const { data: eventData } =
          regData as DoRegisterConfig<EventNameAndPrepend>;
        baseContext.on(eventData.name, (...args: any[]) =>
          methodFun.call(instance, ...args),
        );
        break;
      case 'plugin':
        const pluginDesc: KoishiModulePlugin<any> = await methodFun.call(
          instance,
        );
        if (!pluginDesc || !pluginDesc.plugin) {
          throw new Error(`Invalid plugin from method ${methodKey}.`);
        }
        const pluginCtx = pluginDesc.select
          ? baseContext.select(pluginDesc.select)
          : baseContext.any();
        pluginCtx.plugin(pluginDesc.plugin, pluginDesc.options);
        break;
      case 'command':
        const { data: commandData } = regData as DoRegisterConfig<
          ContextFunction<Command>
        >;
        let command = commandData(baseContext).action(
          (argv: Argv, ...args: any[]) =>
            methodFun.call(instance, argv, ...args),
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
        break;
      default:
        throw new Error(`Unknown operaton type ${regData.type}`);
    }
  }

  async registerContext(ctx: Context) {
    const providers = this.discoveryService.getProviders();
    const controllers = this.discoveryService.getControllers();
    await Promise.all(
      [...providers, ...controllers]
        .filter((wrapper) => wrapper.isDependencyTreeStatic())
        .filter((wrapper) => wrapper.instance)
        .map((wrapper: InstanceWrapper) => {
          const { instance } = wrapper;
          const prototype = Object.getPrototypeOf(instance);
          return this.metadataScanner.scanFromPrototype(
            instance,
            prototype,
            (methodKey: string) =>
              this.handleInstance(ctx, instance, methodKey),
          );
        }),
    );
  }
}
