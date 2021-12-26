import { ModuleMetadata, Provider, Type } from '@nestjs/common';
import {
  App,
  Argv,
  Channel,
  Command,
  Context,
  EventMap,
  FieldCollector,
  Modules,
  Plugin,
  Selection,
  Session,
  User,
} from 'koishi';
import { MetadataArrayMap, MetadataMap } from './koishi.constants';

export interface ContextSelector {
  select?: Selection;
  useSelector?: OnContextFunction;
}

export type KoishiPluginOptions<T extends keyof Modules | Plugin> =
  | boolean
  | (T extends keyof Modules
      ? Plugin.ModuleConfig<Modules[T]>
      : T extends Plugin
      ? Plugin.Config<T>
      : never);

export interface KoishiModulePlugin<T extends keyof Modules | Plugin>
  extends ContextSelector {
  plugin: T;
  options?: boolean | KoishiPluginOptions<T>;
}

export function PluginDef<T extends keyof Modules>(
  plugin: T,
  options?: boolean | Plugin.ModuleConfig<Modules[T]>,
  select?: Selection,
): KoishiModulePlugin<T>;
export function PluginDef<T extends Plugin>(
  plugin: T,
  options?: boolean | Plugin.Config<T>,
  select?: Selection,
): KoishiModulePlugin<T>;
export function PluginDef<T extends keyof Modules | Plugin>(
  plugin: T,
  options?: KoishiPluginOptions<T>,
  select?: Selection,
): KoishiModulePlugin<T> {
  return { plugin, options, select };
}

export interface KoishiModuleSelection extends ContextSelector {
  module: Type<any>;
}

export interface KoishiModuleTopOptions {
  isGlobal?: boolean;
  useWs?: boolean;
}

export interface KoishiModuleOptions
  extends App.Config,
    KoishiModuleTopOptions {
  usePlugins?: KoishiModulePlugin<Plugin>[];
  loggerPrefix?: string;
  loggerColor?: number;
  moduleSelection?: KoishiModuleSelection[];
  globalInterceptors?: KoishiCommandInterceptorRegistration[];
}

export interface KoishiModuleOptionsFactory {
  createKoishiOptions(): Promise<KoishiModuleOptions> | KoishiModuleOptions;
}

export interface KoishiModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'>,
    KoishiModuleTopOptions {
  useExisting?: Type<KoishiModuleOptionsFactory>;
  useClass?: Type<KoishiModuleOptionsFactory>;
  useFactory?: (
    ...args: any[]
  ) => Promise<KoishiModuleOptions> | KoishiModuleOptions;
  inject?: any[];
  extraProviders?: Provider[];
}

export interface CommonEventNameAndPrepend<T extends keyof any> {
  name: T;
  prepend?: boolean;
}

export type EventName = keyof EventMap;
export type EventNameAndPrepend = CommonEventNameAndPrepend<EventName>;

type OmitSubstring<
  S extends string,
  T extends string
> = S extends `${infer L}${T}${infer R}` ? `${L}${R}` : never;
export type BeforeEventName = OmitSubstring<EventName & string, 'before-'>;
export type BeforeEventNameAndPrepend = CommonEventNameAndPrepend<BeforeEventName>;

export type ContextFunction<T> = (ctx: Context) => T;
export type OnContextFunction = ContextFunction<Context>;
export interface DoRegisterConfigDataMap {
  middleware: boolean; // prepend
  onevent: EventNameAndPrepend;
  beforeEvent: BeforeEventNameAndPrepend;
  plugin: never;
  command: CommandRegisterConfig;
}

export interface MappingStruct<
  T extends Record<string | number | symbol, any>,
  K extends keyof T
> {
  type: K;
  data?: T[K];
}

export function GenerateMappingStruct<
  T extends Record<string | number | symbol, any>,
  K extends keyof T
>(type: K, data?: T[K]): MappingStruct<T, K> {
  return {
    type,
    data,
  };
}

export type DoRegisterConfig<
  K extends keyof DoRegisterConfigDataMap = keyof DoRegisterConfigDataMap
> = MappingStruct<DoRegisterConfigDataMap, K>;

// Command stuff

export interface CommandRegisterConfig<D extends string = string> {
  def: D;
  desc?: string;
  config?: CommandConfigExtended;
  putOptions?: CommandPutConfig<keyof CommandPutConfigMap>[];
}

export interface CommandConfigExtended extends Command.Config {
  empty?: boolean;
}

export interface CommandOptionConfig {
  name: string;
  desc: string;
  config?: Argv.OptionConfig;
}

export interface CommandPutConfigMap {
  arg: number;
  argv: never;
  session: never;
  option: CommandOptionConfig;
  user: FieldCollector<'user'>;
  channel: FieldCollector<'channel'>;
  username: boolean;
  sessionField: keyof Session;
}

export type CommandPutConfig<
  K extends keyof CommandPutConfigMap = keyof CommandPutConfigMap
> = MappingStruct<CommandPutConfigMap, K>;

export type CommandDefinitionFun = (cmd: Command) => Command;

// metadata map
export type MetadataArrayValueMap = {
  [K in keyof MetadataArrayMap]: MetadataArrayMap[K][];
};

export type MetadataGenericMap = MetadataArrayValueMap & MetadataMap;

export type MetadataArrayValue<
  K extends keyof MetadataArrayValueMap
> = MetadataArrayValueMap[K];

export type MetadataKey = keyof MetadataArrayMap | keyof MetadataMap;

export type MetadataMapValue<
  K extends MetadataKey
> = K extends keyof MetadataArrayValueMap
  ? MetadataArrayValue<K>
  : K extends keyof MetadataMap
  ? MetadataMap[K]
  : never;

// command interceptor

export interface KoishiCommandInterceptor<
  U extends User.Field = never,
  G extends Channel.Field = never,
  A extends any[] = any[],
  O extends {} = {}
> {
  intercept: Command.Action<U, G, A, O>;
}

export type KoishiCommandInterceptorRegistration<
  U extends User.Field = never,
  G extends Channel.Field = never,
  A extends any[] = any[],
  O extends {} = {}
> =
  | KoishiCommandInterceptor<U, G, A, O>
  | Type<KoishiCommandInterceptor<U, G, A, O>>
  | string
  | symbol;
