import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction } from 'express';
import { KoishiService } from '../koishi.service';
import { IncomingMessage, ServerResponse } from 'http';
import { Http2ServerRequest, Http2ServerResponse } from 'http2';
import { parse } from 'url';

export type RequestWithOriginalUrl = IncomingMessage & { originalUrl?: string };

@Injectable()
export class KoishiMiddleware
  implements NestMiddleware<RequestWithOriginalUrl, ServerResponse>
{
  private readonly koaCallback: (
    req: IncomingMessage | Http2ServerRequest,
    res: ServerResponse | Http2ServerResponse,
  ) => void;
  constructor(private koishi: KoishiService) {
    this.koaCallback = this.koishi._nestKoaTmpInstance.callback();
  }

  use(req: RequestWithOriginalUrl, res: ServerResponse, next: NextFunction) {
    const exactUrl = req.originalUrl || req.url;
    const matchingUrl = parse(exactUrl).pathname || '';
    const match = this.koishi.router.match(matchingUrl, req.method);
    if (!match.route) {
      return next();
    }
    req.url = exactUrl;
    return this.koaCallback(req, res);
  }
}
