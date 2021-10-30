import { ModuleMetadata, Provider, Type } from '@nestjs/common';
import {
  App,
  Argv,
  Channel,
  Command,
  Context,
  EventMap,
  FieldCollector,
  MaybeArray,
  Plugin,
  Session,
  User,
} from 'koishi';
import { MetadataArrayMap, MetadataMap } from './koishi.constants';

const selectors = [
  'user',
  'guild',
  'channel',
  'self',
  'private',
  'platform',
] as const;

type SelectorType = typeof selectors[number];
type SelectorValue = boolean | MaybeArray<string | number>;
type BaseSelection = { [K in SelectorType as `$${K}`]?: SelectorValue };

export interface Selection extends BaseSelection {
  $and?: Selection[];
  $or?: Selection[];
  $not?: Selection;
}

export interface ContextSelector {
  select?: Selection;
  useSelector?: OnContextFunction;
}

export interface KoishiModulePlugin<T extends Plugin> extends ContextSelector {
  plugin: T;
  options?: boolean | Plugin.Config<T>;
}

export function PluginDef<T extends Plugin>(
  plugin: T,
  options?: boolean | Plugin.Config<T>,
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

export type EventName = keyof EventMap;
export interface EventNameAndPrepend {
  name: EventName;
  prepend?: boolean;
}

export type ContextFunction<T> = (ctx: Context) => T;
export type OnContextFunction = ContextFunction<Context>;
export interface DoRegisterConfigDataMap {
  middleware: boolean; // prepend
  onevent: EventNameAndPrepend;
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
  config?: Command.Config;
  putOptions?: CommandPutConfig<keyof CommandPutConfigMap>[];
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
