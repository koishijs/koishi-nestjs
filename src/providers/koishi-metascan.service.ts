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
import { CommandRegisterConfig, Registrar } from 'koishi-decorators';
import { KoishiExceptionHandlerService } from '../koishi-exception-handler/koishi-exception-handler.service';

@Injectable()
export class KoishiMetascanService {
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
  ) {}

  addInterceptors(
    command: Command,
    interceptorDefs: KoishiCommandInterceptorRegistration[],
  ) {
    return this.intercepterManager.addInterceptors(command, interceptorDefs);
  }

  private async handleInstanceRegistration(
    ctx: Context,
    instance: Record<string, any>,
    methodKey: string,
  ) {
    const registrar = new Registrar(instance);
    const baseContext = registrar.getScopeContext(ctx, methodKey, false);
    const result = registrar.register(baseContext, methodKey, false);
    if (result.type === 'command') {
      const command = result.result as Command;
      const interceptorDefs: KoishiCommandInterceptorRegistration[] = _.uniq(
        this.metaFetcher.getPropertyMetadataArray(
          KoishiCommandInterceptorDef,
          instance,
          methodKey,
        ),
      );
      this.addInterceptors(command, interceptorDefs);
      if (!(result.data as CommandRegisterConfig).config?.empty) {
        command.action(async (argv) => {
          try {
            return await argv.next();
          } catch (e) {
            return this.exceptionHandler.handleActionException(e);
          }
        }, true);
      }
    } else if (result.type === 'plugin') {
      const mayBePromise = result.result as Promise<any>;
      if (mayBePromise instanceof Promise) {
        await mayBePromise;
      }
    }
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

  registerContext(ctx: Context) {
    return Promise.all(
      this.runForEachProvider(ctx, (providerCtx, instance) => {
        this.scanInstanceForProvidingContextService(providerCtx, instance);
        const registrar = new Registrar(instance);
        registrar.performTopActions(providerCtx);
        return Promise.all(
          registrar
            .getAllFieldsToRegister()
            .map((methodKey: string) =>
              this.handleInstanceRegistration(providerCtx, instance, methodKey),
            ),
        );
      }),
    );
  }
}
