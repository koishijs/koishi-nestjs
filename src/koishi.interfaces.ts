import { ModuleMetadata, Provider, Type } from '@nestjs/common';
import { App, Command, Context, EventMap, MaybeArray, Plugin } from 'koishi';

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
export type Promisify<T> = T extends Promise<unknown> ? T : Promise<T>;

export type ContextFunction<T> = (ctx: Context) => T;
export type OnContextFunction = ContextFunction<Context>;
export type DoRegisterType = 'middleware' | 'command' | 'onevent' | 'plugin';
export interface DoRegisterConfig<T = any> {
  type: DoRegisterType;
  data?: T;
}

export interface CommandConfigWIthDescription extends Command.Config {
  desc?: string;
}

export type CommandDefinitionFun = (cmd: Command) => Command;
