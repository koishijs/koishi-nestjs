import { ModuleMetadata, Provider, Type } from '@nestjs/common';
import { App, Channel, Command, Context, User } from 'koishi';
import { MetadataArrayMap, MetadataMap } from './koishi.constants';
import { PluginRegistrar, Selection } from 'koishi-thirdeye';

export * from 'koishi-thirdeye/dist/src/def';

export interface KoishiModuleSelection extends Selection {
  module: Type<any>;
}

export interface KoishiModuleTopOptions {
  isGlobal?: boolean;
  useWs?: boolean;
}

export interface KoishiModuleOptions
  extends App.Config,
    KoishiModuleTopOptions {
  usePlugins?: PluginRegistrar.PluginDefinition<any>[];
  loggerPrefix?: string;
  loggerColor?: number;
  moduleSelection?: KoishiModuleSelection[];
  globalInterceptors?: KoishiCommandInterceptorRegistration[];
  actionErrorMessage?: string;
  templateParams?: any;
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

// metadata map
export type MetadataArrayValueMap = {
  [K in keyof MetadataArrayMap]: MetadataArrayMap[K][];
};

export type MetadataGenericMap = MetadataArrayValueMap & MetadataMap;

export type MetadataArrayValue<K extends keyof MetadataArrayValueMap> =
  MetadataArrayValueMap[K];

export type MetadataKey = keyof MetadataArrayMap | keyof MetadataMap;

export type MetadataMapValue<K extends MetadataKey> =
  K extends keyof MetadataArrayValueMap
    ? MetadataArrayValue<K>
    : K extends keyof MetadataMap
    ? MetadataMap[K]
    : never;

// command interceptor

export interface KoishiCommandInterceptor<
  U extends User.Field = never,
  G extends Channel.Field = never,
  A extends any[] = any[],
  // eslint-disable-next-line @typescript-eslint/ban-types
  O extends {} = {},
> {
  intercept: Command.Action<U, G, A, O>;
}

export type KoishiCommandInterceptorRegistration<
  U extends User.Field = never,
  G extends Channel.Field = never,
  A extends any[] = any[],
  // eslint-disable-next-line @typescript-eslint/ban-types
  O extends {} = {},
> =
  | KoishiCommandInterceptor<U, G, A, O>
  | Type<KoishiCommandInterceptor<U, G, A, O>>
  | string
  | symbol;

export type ServiceName = keyof Context | string;
