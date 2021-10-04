import { Inject } from '@nestjs/common';
import {
  KOISHI_CONTEXT,
  KOISHI_CONTEXT_CHANNEL,
  KOISHI_CONTEXT_PRIVATE,
} from './koishi.constants';

export const InjectContext = () => Inject(KOISHI_CONTEXT);
export const InjectContextPrivate = () => Inject(KOISHI_CONTEXT_PRIVATE);
export const InjectContextChannel = () => Inject(KOISHI_CONTEXT_CHANNEL);
