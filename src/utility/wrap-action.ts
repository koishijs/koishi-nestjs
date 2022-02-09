import { HttpException } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';

export function handleActionException(e: Error) {
  if (e instanceof HttpException || e instanceof WsException) {
    return e.message;
  } else {
    throw e;
  }
}
