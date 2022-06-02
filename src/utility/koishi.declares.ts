import { KoishiCommandInterceptorRegistration } from './koishi.interfaces';
import { IntercepterManagerService } from './koishi.workarounds';

interface ContextInterceptorMeta {
  interceptors: KoishiCommandInterceptorRegistration[];
}

declare module 'koishi' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Context {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface Meta extends ContextInterceptorMeta {}
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface Context extends ContextInterceptorMeta {
    $interceptorManager: IntercepterManagerService;
    withInterceptors(
      interceptors: KoishiCommandInterceptorRegistration[],
    ): Context;
  }
}
