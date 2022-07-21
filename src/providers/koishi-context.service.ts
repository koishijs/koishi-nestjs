import { Inject, Injectable, Type } from '@nestjs/common';
import { KOISHI_MODULE_OPTIONS } from '../utility/koishi.constants';
import {
  KoishiModuleOptions,
  KoishiModuleSelection,
} from '../utility/koishi.interfaces';
import { Context } from 'koishi';
import { Module } from '@nestjs/core/injector/module';
import { selectContext } from 'koishi-thirdeye';
import { koishiRegistrar } from 'koishi-thirdeye/dist/src/registrar';

@Injectable()
export class KoishiContextService {
  moduleSelections = new Map<Type<any>, KoishiModuleSelection>();
  constructor(
    @Inject(KOISHI_MODULE_OPTIONS) private options: KoishiModuleOptions,
  ) {
    if (options.moduleSelection) {
      for (const selection of options.moduleSelection) {
        this.moduleSelections.set(selection.module, selection);
      }
    }
  }

  getModuleCtx(ctx: Context, module: Module) {
    const moduleSelection = this.moduleSelections.get(module.metatype);
    if (moduleSelection) {
      return selectContext(ctx, moduleSelection);
    } else {
      return ctx;
    }
  }

  getProviderCtx(ctx: Context, ...instances: any[]) {
    for (const instance of instances) {
      ctx = koishiRegistrar
        .aspect(instance, this.options.templateParams || {})
        .getScopeContext(ctx);
    }
    return ctx;
  }
}
