// Injections
import { KoishiCommandInterceptorRegistration } from './koishi.interfaces';
import { Context } from 'koishi';

export const KOISHI_MODULE_OPTIONS = 'KOISHI_MODULE_OPTIONS';
export const KOISHI_CONTEXT = 'KOISHI_CONTEXT';

// metadatas
export const KoishiCommandInterceptorDef = 'KoishiCommandInterceptorDef';

export const KoishiServiceWireProperty = 'KoishiServiceWireProperty';
export const KoishiServiceWireKeys = 'KoishiServiceWireKeys';
export const KoishiServiceProvideSym = 'KoishiServiceProvideSym';

// metadata map

export interface MetadataArrayMap {
  KoishiServiceProvideSym: keyof Context.Services;
  KoishiCommandInterceptorDef: KoishiCommandInterceptorRegistration;
}

export interface MetadataMap {}

export const KoishiIpSym = Symbol('KoishiIpSym');
