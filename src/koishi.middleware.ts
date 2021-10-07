import { Injectable, NestMiddleware, OnModuleInit } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { KoishiService } from './koishi.service';
import { createProxyMiddleware, RequestHandler } from 'http-proxy-middleware';

@Injectable()
export class KoishiMiddleware
  implements NestMiddleware<Request, Response>, OnModuleInit {
  constructor(private koishi: KoishiService) {}

  private proxyMiddleware: RequestHandler;

  async onModuleInit() {
    this.proxyMiddleware = createProxyMiddleware({
      target: `http://localhost:${this.koishi._nestKoaTmpServerPort}`,
      ws: false,
      logLevel: 'silent',
    });
  }

  use(req: Request, res: Response, next: NextFunction) {
    const match = this.koishi.router.match(req.baseUrl, req.method);
    if (!match.route) {
      return next();
    }
    return this.proxyMiddleware(req, res, next);
  }
}
