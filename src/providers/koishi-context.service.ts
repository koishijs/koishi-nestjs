import { Inject, Injectable, Type } from '@nestjs/common';
import {
  KOISHI_MODULE_OPTIONS,
  KoishiOnContextScope,
} from '../utility/koishi.constants';
import {
  KoishiModuleOptions,
  KoishiModuleSelection,
} from '../utility/koishi.interfaces';
import { applySelector } from '../utility/koishi.utility';
import { Context } from 'koishi';
import { Module } from '@nestjs/core/injector/module';
import { KoishiMetadataFetcherService } from '../koishi-metadata-fetcher/koishi-metadata-fetcher.service';
import _ from 'lodash';

@Injectable()
export class KoishiContextService {
  moduleSelections = new Map<Type<any>, KoishiModuleSelection>();
  constructor(
    @Inject(KOISHI_MODULE_OPTIONS) options: KoishiModuleOptions,
    private readonly metaFetcher: KoishiMetadataFetcherService,
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
      return applySelector(ctx, moduleSelection);
    } else {
      return ctx;
    }
  }

  getProviderCtx(ctx: Context, ...instances: any[]) {
    const contextFilters = _.flatten(
      instances.map((instance) =>
        this.metaFetcher.getMetadataArray(KoishiOnContextScope, instance),
      ),
    );
    for (const filter of contextFilters) {
      ctx = filter(ctx) || ctx;
    }
    return ctx;
  }
}
