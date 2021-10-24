import { ModuleMetadata, Provider, Type } from '@nestjs/common';
import {
  App,
  Argv,
  Command,
  Context,
  EventMap,
  MaybeArray,
  Plugin,
} from 'koishi';

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

export interface WhetherGlobalOption {
  isGlobal?: boolean;
}

export interface KoishiModuleOptions extends App.Config, WhetherGlobalOption {
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
    WhetherGlobalOption {
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
}

export type CommandPutConfig<
  K extends keyof CommandPutConfigMap = keyof CommandPutConfigMap
> = MappingStruct<CommandPutConfigMap, K>;

export type CommandDefinitionFun = (cmd: Command) => Command;
