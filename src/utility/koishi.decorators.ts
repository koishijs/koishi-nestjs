import { CustomDecorator, Inject } from '@nestjs/common';
import {
  KOISHI_CONTEXT,
  KoishiCommandInterceptorDef,
  KoishiServiceProvideSym,
  KoishiServiceWireKeys,
  KoishiServiceWireProperty,
  MetadataArrayMap,
} from './koishi.constants';
import {
  KoishiCommandInterceptorRegistration,
  MetadataArrayValue,
  MetadataArrayValueMap,
  MetadataGenericMap,
  MetadataKey,
  ServiceName,
} from './koishi.interfaces';
import { Context } from 'koishi';
import {
  ContextScopeTypes,
  getContextProvideToken,
} from './koishi-context.factory';
import { CallbackLayer } from 'koishi-decorators';

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
  VM extends Partial<MetadataGenericMap> = MetadataGenericMap,
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
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
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

// Export all koishi-decorator decorators

export * from 'koishi-decorators/dist/src/decorators';
export { PluginDef } from 'koishi-decorators';

// Service

export function WireContextService(name?: ServiceName): PropertyDecorator {
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
  name: ServiceName,
  options: Context.ServiceOptions,
): ClassDecorator {
  Context.service(name, options);
  return AppendMetadata(KoishiServiceProvideSym, name);
}

export const UsingService = (...services: ServiceName[]) =>
  CallbackLayer((ctx, cb) => ctx.using(services, cb));

// Command interceptor

export const CommandInterceptors = (
  ...interceptors: KoishiCommandInterceptorRegistration[]
): MethodDecorator & ClassDecorator =>
  ConcatMetadata(KoishiCommandInterceptorDef, interceptors);
