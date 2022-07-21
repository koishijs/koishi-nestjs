import { Inject, Injectable } from '@nestjs/common';
import { MetadataScanner, ModuleRef, ModulesContainer } from '@nestjs/core';
import { Command, Context } from 'koishi';
import {
  KOISHI_MODULE_OPTIONS,
  KoishiCommandInterceptorDef,
  KoishiServiceProvideSym,
  KoishiServiceWireKeys,
  KoishiServiceWireProperty,
} from '../utility/koishi.constants';
import {
  KoishiCommandInterceptorRegistration,
  KoishiModuleOptions,
} from '../utility/koishi.interfaces';
import _ from 'lodash';
import { KoishiContextService } from './koishi-context.service';
import { Module } from '@nestjs/core/injector/module';
import { KoishiMetadataFetcherService } from '../koishi-metadata-fetcher/koishi-metadata-fetcher.service';
import { KoishiInterceptorManagerService } from '../koishi-interceptor-manager/koishi-interceptor-manager.service';
import { KoishiExceptionHandlerService } from '../koishi-exception-handler/koishi-exception-handler.service';
import { registerAtLeastEach } from '../utility/take-first-value';
import { koishiRegistrar } from 'koishi-thirdeye/dist/src/registrar';
import { CommandConfigExtended } from 'koishi-thirdeye/dist/src/def';
import { map } from 'rxjs';

@Injectable()
export class KoishiMetascanService {
  private readonly templateParams: any;

  constructor(
    private readonly metadataScanner: MetadataScanner,
    private readonly moduleRef: ModuleRef,
    private readonly moduleContainer: ModulesContainer,
    private readonly ctxService: KoishiContextService,
    private readonly metaFetcher: KoishiMetadataFetcherService,
    @Inject(KOISHI_MODULE_OPTIONS)
    private readonly koishiModuleOptions: KoishiModuleOptions,
    private readonly intercepterManager: KoishiInterceptorManagerService,
    private readonly exceptionHandler: KoishiExceptionHandlerService,
  ) {
    this.templateParams = koishiModuleOptions.templateParams || {};
  }

  addInterceptors(
    command: Command,
    interceptorDefs: KoishiCommandInterceptorRegistration[],
  ) {
    return this.intercepterManager.addInterceptors(command, interceptorDefs);
  }

  private registerOnService(
    ctx: Context,
    instance: any,
    property: string,
    name: keyof Context,
  ) {
    Object.defineProperty(instance, property, {
      enumerable: true,
      configurable: true,
      get() {
        return ctx[name];
      },
      set(val: any) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        ctx[name] = val;
      },
    });
  }

  private scanInstanceForProvidingContextService(ctx: Context, instance: any) {
    const providingServiceNames = this.metaFetcher.getMetadataArray(
      KoishiServiceProvideSym,
      instance.constructor,
    );
    for (const name of providingServiceNames) {
      ctx[name] = instance;
    }
  }

  private scanInstanceForWireContextService(ctx: Context, instance: any) {
    const instanceClass = instance.constructor;
    const properties: string[] = Reflect.getMetadata(
      KoishiServiceWireKeys,
      instanceClass,
    );
    if (!properties) {
      return;
    }
    for (const property of properties) {
      const serviceName: keyof Context = Reflect.getMetadata(
        KoishiServiceWireProperty,
        instanceClass,
        property,
      );
      this.registerOnService(ctx, instance, property, serviceName);
    }
  }

  private getAllActiveProvidersFromModule(module: Module) {
    return [
      ...Array.from(module.routes.values()),
      ...Array.from(module.providers.values()),
    ]
      .filter((wrapper) => wrapper.isDependencyTreeStatic())
      .filter((wrapper) => wrapper.instance);
  }

  private runForEachProvider<T>(
    ctx: Context,
    fun: (ctx: Context, instance: any) => T,
  ): T[] {
    const modules = Array.from(this.moduleContainer.values());
    return _.flatten(
      modules.map((module) => {
        const moduleCtx = this.ctxService.getModuleCtx(ctx, module);
        const allProviders = this.getAllActiveProvidersFromModule(module);
        return allProviders.map((provider) => {
          const instance = provider.instance;
          const providerCtx = this.ctxService.getProviderCtx(
            moduleCtx,
            instance,
          );
          return fun(providerCtx, instance);
        });
      }),
    );
  }

  preRegisterContext(ctx: Context) {
    this.runForEachProvider(ctx, (providerCtx, instance) =>
      this.scanInstanceForWireContextService(providerCtx, instance),
    );
  }

  private mutateCommandRegistration(
    instance: any,
    key: string,
    command: Command,
  ) {
    const interceptorDefs: KoishiCommandInterceptorRegistration[] = _.uniq(
      this.metaFetcher.getPropertyMetadataArray(
        KoishiCommandInterceptorDef,
        instance,
        key,
      ),
    );
    this.addInterceptors(command, interceptorDefs);
    const config = command.config as CommandConfigExtended;
    if (!config?.empty) {
      command.action(async (argv) => {
        try {
          return await argv.next();
        } catch (e) {
          return this.exceptionHandler.handleActionException(e);
        }
      }, true);
    }
  }

  registerContext(ctx: Context) {
    return Promise.all(
      this.runForEachProvider(ctx, (providerCtx, instance) => {
        this.scanInstanceForProvidingContextService(providerCtx, instance);
        const registrar = koishiRegistrar.aspect(instance, this.templateParams);
        const allFields = registrar.getAllFieldsToRegister();
        return registerAtLeastEach(
          registrar.register(providerCtx).pipe(
            map((result) => {
              if (result.type === 'command') {
                this.mutateCommandRegistration(
                  instance,
                  result.key,
                  result.result,
                );
              }
              return result;
            }),
          ),
          allFields,
        );
      }),
    );
  }
}
