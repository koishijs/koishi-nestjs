import { CustomDecorator, Inject, SetMetadata } from '@nestjs/common';
import {
  KOISHI_CONTEXT,
  KoishiCommandDefinition,
  KoishiCommandPutDef,
  KoishiDoRegister,
  KoishiOnContextScope,
  KoishiServiceProvideSym,
  KoishiServiceWireKeys,
  KoishiServiceWireProperty,
  MetadataArrayMap,
} from './utility/koishi.constants';
import {
  CommandDefinitionFun,
  CommandPutConfig,
  CommandPutConfigMap,
  DoRegisterConfig,
  EventName,
  GenerateMappingStruct,
  OnContextFunction,
  Selection,
} from './koishi.interfaces';
import { Argv, Command, Context, FieldCollector, Session } from 'koishi';
import {
  ContextScopeTypes,
  getContextProvideToken,
} from './koishi-context.factory';

// Injections
export const InjectContext = () => Inject(KOISHI_CONTEXT);
export const InjectContextSpecific = (
  scopeType?: ContextScopeTypes,
  values: string[] = [],
) => Inject(getContextProvideToken(scopeType, values));
export const InjectContextPrivate = (...values: string[]) =>
  InjectContextSpecific('private', values);
export const InjectContextChannel = (...values: string[]) =>
  InjectContextSpecific('channel', values);
export const InjectContextGuild = (...values: string[]) =>
  InjectContextSpecific('guild', values);
export const InjectContextSelf = (...values: string[]) =>
  InjectContextSpecific('self', values);
export const InjectContextPlatform = (...values: string[]) =>
  InjectContextSpecific('platform', values);
export const InjectContextUser = (...values: string[]) =>
  InjectContextSpecific('user', values);

export const SetExtraMetadata = <K extends keyof MetadataArrayMap>(
  metadataKey: K,
  metadataValue: MetadataArrayMap[K],
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
  SetMetadata<string, DoRegisterConfig<'middleware'>>(
    KoishiDoRegister,
    GenerateMappingStruct('middleware', prepend),
  );
export const UseEvent = (name: EventName, prepend?: boolean): MethodDecorator =>
  SetMetadata<string, DoRegisterConfig<'onevent'>>(
    KoishiDoRegister,
    GenerateMappingStruct('onevent', { name, prepend }),
  );
export const UsePlugin = (): MethodDecorator =>
  SetMetadata<string, DoRegisterConfig<'plugin'>>(
    KoishiDoRegister,
    GenerateMappingStruct('plugin'),
  );

export function UseCommand<D extends string>(
  def: D,
  config?: Command.Config,
): MethodDecorator;
export function UseCommand<D extends string>(
  def: D,
  desc: string,
  config?: Command.Config,
): MethodDecorator;
export function UseCommand(
  def: string,
  ...args: [Command.Config?] | [string, Command.Config?]
): MethodDecorator {
  const desc = typeof args[0] === 'string' ? (args.shift() as string) : '';
  const config = args[0] as Command.Config;
  return (obj, key: string, des) => {
    const putOptions: CommandPutConfig<keyof CommandPutConfigMap>[] =
      Reflect.getMetadata(KoishiCommandPutDef, obj.constructor, key) ||
      undefined;
    // console.log(Reflect.getMetadata('design:paramtypes', obj, key));
    const metadataDec = SetMetadata<string, DoRegisterConfig<'command'>>(
      KoishiDoRegister,
      {
        type: 'command',
        data: {
          def,
          desc,
          config,
          putOptions,
        },
      },
    );
    return metadataDec(obj, key, des);
  };
}

// Context scopes

export const OnContext = (
  ctxFun: OnContextFunction,
): MethodDecorator & ClassDecorator =>
  SetExtraMetadata(KoishiOnContextScope, ctxFun);

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
  SetExtraMetadata(KoishiCommandDefinition, def);

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

export const CommandUserFields = (fields: FieldCollector<'user'>) =>
  CommandDef((cmd) => cmd.userFields(fields));

export const CommandChannelFields = (fields: FieldCollector<'channel'>) =>
  CommandDef((cmd) => cmd.channelFields(fields));

// Command put config

function PutCommandParam<T extends keyof CommandPutConfigMap>(
  type: T,
  data?: CommandPutConfigMap[T],
): ParameterDecorator {
  return (obj, key: string, index) => {
    const objClass = obj.constructor;
    const list: CommandPutConfig<T>[] =
      Reflect.getMetadata(KoishiCommandPutDef, objClass, key) || [];
    list[index] = GenerateMappingStruct(type, data);
    Reflect.defineMetadata(KoishiCommandPutDef, list, objClass, key);
  };
}

export const PutArgv = () => PutCommandParam('argv');
export const PutSession = (field?: keyof Session) =>
  field ? PutCommandParam('sessionField', field) : PutCommandParam('session');
export const PutArg = (i: number) => PutCommandParam('arg', i);
export const PutOption = (
  name: string,
  desc: string,
  config: Argv.OptionConfig = {},
) => PutCommandParam('option', { name, desc, config });

export const PutUser = (field: FieldCollector<'user'>) =>
  PutCommandParam('user', field);

export const PutChannel = (field: FieldCollector<'channel'>) =>
  PutCommandParam('channel', field);

export const PutUserName = (useDatabase = true) =>
  PutCommandParam('username', useDatabase);

export const PutUserId = () => PutSession('userId');
export const PutGuildId = () => PutSession('guildId');
export const PutGuildName = () => PutSession('guildName');
export const PutChannelId = () => PutSession('channelId');
export const PutChannelName = () => PutSession('channelName');
export const PutSelfId = () => PutSession('selfId');
export const PutBot = () => PutSession('bot');

// Service

export function WireContextService(name?: string): PropertyDecorator {
  return (obj, key) => {
    const objClass = obj.constructor;
    const properties: string[] =
      Reflect.getMetadata(KoishiServiceWireKeys, objClass) || [];
    properties.push(key.toString());
    Reflect.defineMetadata(KoishiServiceWireKeys, properties, objClass);
    Reflect.defineMetadata(
      KoishiServiceWireProperty,
      name || key,
      objClass,
      key,
    );
  };
}

export function ProvideContextService(
  name: keyof Context.Services,
): ClassDecorator {
  Context.service(name);
  return SetExtraMetadata(KoishiServiceProvideSym, name);
}
