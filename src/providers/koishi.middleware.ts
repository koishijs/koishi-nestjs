import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { KoishiService } from '../koishi.service';
import { IncomingMessage, ServerResponse } from 'http';
import { Http2ServerRequest, Http2ServerResponse } from 'http2';

@Injectable()
export class KoishiMiddleware implements NestMiddleware<Request, Response> {
  private readonly koaCallback: (
    req: IncomingMessage | Http2ServerRequest,
    res: ServerResponse | Http2ServerResponse,
  ) => void;
  constructor(private koishi: KoishiService) {
    this.koaCallback = this.koishi._nestKoaTmpInstance.callback();
  }

  use(req: Request, res: Response, next: NextFunction) {
    const baseUrl = req.baseUrl || req.url;
    const exactUrl = req.originalUrl || baseUrl;
    const match = this.koishi.router.match(baseUrl, req.method);
    if (!match.route) {
      return next();
    }
    req.url = exactUrl;
    return this.koaCallback(req, res);
  }
}
