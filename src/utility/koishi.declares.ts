import { KoishiCommandInterceptorRegistration } from './koishi.interfaces';
import { IntercepterManagerService } from './koishi.workarounds';

interface ContextNestMeta {
  forkedProvider?: boolean;
  interceptors: KoishiCommandInterceptorRegistration[];
}

declare module 'koishi' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Context {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface Meta extends ContextNestMeta {}
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface Context extends ContextNestMeta {
    $interceptorManager: IntercepterManagerService;
    withInterceptors(
      interceptors: KoishiCommandInterceptorRegistration[],
    ): Context;
  }
}
