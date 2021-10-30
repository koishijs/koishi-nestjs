// Injections
import {
  CommandDefinitionFun,
  DoRegisterConfig,
  KoishiCommandInterceptor,
  KoishiCommandInterceptorRegistration,
  OnContextFunction,
} from './koishi.interfaces';
import { Context } from 'koishi';
import { Type } from '@nestjs/common';

export const KOISHI_MODULE_OPTIONS = 'KOISHI_MODULE_OPTIONS';
export const KOISHI_CONTEXT = 'KOISHI_CONTEXT';

// metadatas
export const KoishiOnContextScope = 'KoishiOnContextScope';
export const KoishiDoRegister = 'KoishiDoRegister';
export const KoishiCommandDefinition = 'KoishiCommandDefinition';
export const KoishiCommandPutDef = 'KoishiCommandPutDef';
export const KoishiCommandInterceptorDef = 'KoishiCommandInterceptorDef';

export const KoishiServiceWireProperty = 'KoishiServiceWireProperty';
export const KoishiServiceWireKeys = 'KoishiServiceWireKeys';
export const KoishiServiceProvideSym = 'KoishiServiceProvideSym';

// metadata map

export interface MetadataArrayMap {
  KoishiOnContextScope: OnContextFunction;
  KoishiCommandDefinition: CommandDefinitionFun;
  KoishiServiceProvideSym: keyof Context.Services;
  KoishiCommandInterceptorDef: KoishiCommandInterceptorRegistration;
}

export interface MetadataMap {
  KoishiDoRegister: DoRegisterConfig;
}
