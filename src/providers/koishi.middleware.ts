import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction } from 'express';
import { KoishiService } from '../koishi.service';
import { IncomingMessage, ServerResponse } from 'http';
import { Http2ServerRequest, Http2ServerResponse } from 'http2';
import { parse } from 'url';
import { KoishiIpSym } from '../utility/koishi.constants';

export type RequestExtended = IncomingMessage & {
  originalUrl?: string;
  ip?: string;
  ips?: string[];
};

@Injectable()
export class KoishiMiddleware
  implements NestMiddleware<RequestExtended, ServerResponse>
{
  private readonly koaCallback: (
    req: IncomingMessage | Http2ServerRequest,
    res: ServerResponse | Http2ServerResponse,
  ) => void;
  constructor(private koishi: KoishiService) {
    this.koaCallback = this.koishi._nestKoaTmpInstance.callback();
  }

  use(req: RequestExtended, res: ServerResponse, next: NextFunction) {
    const exactUrl = req.originalUrl || req.url;
    const matchingUrl = parse(exactUrl).pathname || '';
    const match = this.koishi.router.match(matchingUrl, req.method);
    if (!match.route) {
      return next();
    }
    req.url = exactUrl;
    req[KoishiIpSym] = req.ip;
    return this.koaCallback(req, res);
  }
}
