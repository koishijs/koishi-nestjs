import { Context } from 'koishi';
import { Provider, Scope } from '@nestjs/common';
import { KOISHI_CONTEXT } from './utility/koishi.constants';

export type ContextScopeTypes =
  | 'guild'
  | 'channel'
  | 'platform'
  | 'user'
  | 'self'
  | 'private';

function constructProvideToken(
  scopeType: ContextScopeTypes,
  values: string[] = [],
) {
  return `KOISHI_CONTEXT_${scopeType}_${values
    .map((v) => v.replace(/_/g, '__'))
    .join('_')}`;
}

function createContextProvider(
  scopeType: ContextScopeTypes,
  values: string[] = [],
) {
  return {
    provide: constructProvideToken(scopeType, values),
    inject: [KOISHI_CONTEXT],
    scope: Scope.TRANSIENT,
    useFactory: (ctx: Context) => ctx[scopeType](...values),
  };
}

export const contextsToProvide: Provider<Context>[] = [];

const contextTokensSet = new Set<string>();

export function getContextProvideToken(
  scopeType?: ContextScopeTypes,
  values: string[] = [],
) {
  if (!scopeType) {
    return KOISHI_CONTEXT;
  }
  const token = constructProvideToken(scopeType, values);
  if (!contextTokensSet.has(token)) {
    contextTokensSet.add(token);
    contextsToProvide.push(createContextProvider(scopeType, values));
  }
  return token;
}
