import { CustomDecorator, Inject, SetMetadata } from '@nestjs/common';
import {
  KOISHI_CONTEXT,
  KOISHI_CONTEXT_CHANNEL,
  KOISHI_CONTEXT_GUILD,
  KOISHI_CONTEXT_PRIVATE,
  KoishiCommandDefinition,
  KoishiDoRegister,
  KoishiOnContextScope,
} from './koishi.constants';
import {
  CommandConfigWIthDescription,
  CommandDefinitionFun,
  ContextFunction,
  DoRegisterConfig,
  EventName,
  EventNameAndPrepend,
  OnContextFunction,
  Selection,
} from './koishi.interfaces';
import { Context, Command, Argv } from 'koishi';

// Injections
export const InjectContext = () => Inject(KOISHI_CONTEXT);
export const InjectContextPrivate = () => Inject(KOISHI_CONTEXT_PRIVATE);
export const InjectContextChannel = () => Inject(KOISHI_CONTEXT_CHANNEL);
export const InjectContextGuild = () => Inject(KOISHI_CONTEXT_GUILD);

export const SetExtraMetadata = <K = string, V = any>(
  metadataKey: K,
  metadataValue: V,
): CustomDecorator<K> => {
  const decoratorFactory = (target: any, key?: any, descriptor?: any) => {
    const currentMetadata: any[] =
      Reflect.getMetadata(
        metadataKey,
        descriptor ? descriptor.value : target,
      ) || [];
    currentMetadata.push(metadataValue);
    if (descriptor) {
      Reflect.defineMetadata(metadataKey, currentMetadata, descriptor.value);
      return descriptor;
    }
    Reflect.defineMetadata(metadataKey, currentMetadata, target);
    return target;
  };
  decoratorFactory.KEY = metadataKey;
  return decoratorFactory;
};

// Register methods
export const UseMiddleware = (prepend?: boolean): MethodDecorator =>
  SetMetadata<string, DoRegisterConfig<boolean>>(KoishiDoRegister, {
    type: 'middleware',
    data: prepend,
  });
export const UseEvent = (name: EventName, prepend?: boolean): MethodDecorator =>
  SetMetadata<string, DoRegisterConfig<EventNameAndPrepend>>(KoishiDoRegister, {
    type: 'onevent',
    data: { name, prepend },
  });
export const UsePlugin = (): MethodDecorator =>
  SetMetadata<string, DoRegisterConfig>(KoishiDoRegister, {
    type: 'plugin',
  });

export function UseCommand<D extends string>(
  def: D,
  config?: Command.Config,
): MethodDecorator {
  return SetMetadata<
    string,
    DoRegisterConfig<
      ContextFunction<Command<never, never, Argv.ArgumentType<D>>>
    >
  >(KoishiDoRegister, {
    type: 'command',
    data: (ctx) => ctx.command(def, config),
  });
}

// Context scopes

export const OnContext = (
  ctxFun: OnContextFunction,
): MethodDecorator & ClassDecorator =>
  SetExtraMetadata<string, OnContextFunction>(KoishiOnContextScope, ctxFun);

export const OnUser = (...values: string[]) =>
  OnContext((ctx) => ctx.user(...values));

export const OnSelf = (...values: string[]) =>
  OnContext((ctx) => ctx.self(...values));

export const OnGuild = (...values: string[]) =>
  OnContext((ctx) => ctx.guild(...values));

export const OnChannel = (...values: string[]) =>
  OnContext((ctx) => ctx.channel(...values));

export const OnPlatform = (...values: string[]) =>
  OnContext((ctx) => ctx.platform(...values));

export const OnPrivate = (...values: string[]) =>
  OnContext((ctx) => ctx.private(...values));

export const OnSelection = (selection: Selection) =>
  OnContext((ctx) => ctx.select(selection));

// Command definition

export const CommandDef = (def: CommandDefinitionFun): MethodDecorator =>
  SetExtraMetadata<string, CommandDefinitionFun>(KoishiCommandDefinition, def);

export const CommandDescription = (desc: string) =>
  CommandDef((cmd) => {
    cmd.description = desc;
    return cmd;
  });

export const CommandAlias = (...names: string[]) =>
  CommandDef((cmd) => cmd.alias(...names));

export const CommandShortcut = (
  name: string | RegExp,
  config: Command.Shortcut = {},
) => CommandDef((cmd) => cmd.shortcut(name, config));

export const CommandUsage = (text: string) =>
  CommandDef((cmd) => cmd.usage(text));

export const CommandExample = (text: string) =>
  CommandDef((cmd) => cmd.example(text));

export const CommandOption = (
  name: string,
  desc: string,
  config: Argv.OptionConfig = {},
) => CommandDef((cmd) => cmd.option(name, desc, config));
