import { CustomDecorator, Inject } from '@nestjs/common';
import {
  KOISHI_CONTEXT,
  KoishiCommandDefinition,
  KoishiCommandInterceptorDef,
  KoishiCommandPutDef,
  KoishiDoRegister,
  KoishiOnContextScope,
  KoishiServiceProvideSym,
  KoishiServiceWireKeys,
  KoishiServiceWireProperty,
  MetadataArrayMap,
} from './koishi.constants';
import {
  BeforeEventName,
  CommandConfigExtended,
  CommandDefinitionFun,
  CommandPutConfig,
  CommandPutConfigMap,
  EventName,
  GenerateMappingStruct,
  KoishiCommandInterceptorRegistration,
  MetadataArrayValue,
  MetadataArrayValueMap,
  MetadataGenericMap,
  MetadataKey,
  OnContextFunction,
} from './koishi.interfaces';
import {
  Argv,
  Command,
  Context,
  FieldCollector,
  Selection,
  Session,
} from 'koishi';
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

// metadata extended

export function TransformMetadata<
  K extends MetadataKey,
  VM extends Partial<MetadataGenericMap> = MetadataGenericMap
>(
  metadataKey: K,
  metadataValueFun: (oldValue: VM[K]) => VM[K],
): CustomDecorator<K> {
  const decoratorFactory = (target: any, key?: any, descriptor?: any) => {
    const oldValue: VM[K] =
      Reflect.getMetadata(
        metadataKey,
        descriptor ? descriptor.value : target,
      ) || [];
    const newValue = metadataValueFun(oldValue);
    if (descriptor) {
      Reflect.defineMetadata(metadataKey, newValue, descriptor.value);
      return descriptor;
    }
    Reflect.defineMetadata(metadataKey, newValue, target);
    return target;
  };
  decoratorFactory.KEY = metadataKey;
  return decoratorFactory;
}

export const SetMetadata = <K extends keyof MetadataGenericMap>(
  metadataKey: K,
  metadataValue: MetadataGenericMap[K],
): CustomDecorator<K> => TransformMetadata<K>(metadataKey, () => metadataValue);

export const AppendMetadata = <K extends keyof MetadataArrayMap>(
  metadataKey: K,
  metadataValue: MetadataArrayMap[K],
): CustomDecorator<K> =>
  TransformMetadata<K, MetadataArrayValueMap>(metadataKey, (arr) => {
    const newArr = arr || [];
    newArr.push(metadataValue);
    return newArr;
  });

export const ConcatMetadata = <K extends keyof MetadataArrayValueMap>(
  metadataKey: K,
  metadataValue: MetadataArrayValue<K>,
): CustomDecorator<K> =>
  TransformMetadata<K, MetadataArrayValueMap>(metadataKey, (arr) =>
    ((arr || []) as any[]).concat(metadataValue),
  );

// Register methods
export const UseMiddleware = (prepend?: boolean): MethodDecorator =>
  SetMetadata(KoishiDoRegister, GenerateMappingStruct('middleware', prepend));
export const UseEvent = (name: EventName, prepend?: boolean): MethodDecorator =>
  SetMetadata(
    KoishiDoRegister,
    GenerateMappingStruct('onevent', { name, prepend }),
  );

export const BeforeEvent = (
  name: BeforeEventName,
  prepend?: boolean,
): MethodDecorator =>
  SetMetadata(
    KoishiDoRegister,
    GenerateMappingStruct('beforeEvent', { name, prepend }),
  );

export const UsePlugin = (): MethodDecorator =>
  SetMetadata(KoishiDoRegister, GenerateMappingStruct('plugin'));

export function UseCommand<D extends string>(
  def: D,
  config?: CommandConfigExtended,
): MethodDecorator;
export function UseCommand<D extends string>(
  def: D,
  desc: string,
  config?: CommandConfigExtended,
): MethodDecorator;
export function UseCommand(
  def: string,
  ...args: [CommandConfigExtended?] | [string, CommandConfigExtended?]
): MethodDecorator {
  const desc = typeof args[0] === 'string' ? (args.shift() as string) : '';
  const config = args[0] as CommandConfigExtended;
  return (obj, key: string, des) => {
    const putOptions: CommandPutConfig<keyof CommandPutConfigMap>[] =
      Reflect.getMetadata(KoishiCommandPutDef, obj.constructor, key) ||
      undefined;
    // console.log(Reflect.getMetadata('design:paramtypes', obj, key));
    const metadataDec = SetMetadata(KoishiDoRegister, {
      type: 'command',
      data: {
        def,
        desc,
        config,
        putOptions,
      },
    });
    return metadataDec(obj, key, des);
  };
}

// Context scopes

export const OnContext = (
  ctxFun: OnContextFunction,
): MethodDecorator & ClassDecorator =>
  AppendMetadata(KoishiOnContextScope, ctxFun);

export const OnAnywhere = () => OnContext((ctx) => ctx.any());

export const OnNowhere = () => OnContext((ctx) => ctx.never());

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
  AppendMetadata(KoishiCommandDefinition, def);

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

export function WireContextService(
  name?: keyof Context.Services,
): PropertyDecorator {
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
  return AppendMetadata(KoishiServiceProvideSym, name);
}

// Command interceptor

export const CommandInterceptors = (
  ...interceptors: KoishiCommandInterceptorRegistration[]
): MethodDecorator & ClassDecorator =>
  ConcatMetadata(KoishiCommandInterceptorDef, interceptors);
