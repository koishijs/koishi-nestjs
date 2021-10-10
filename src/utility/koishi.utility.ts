import { Context } from 'koishi';
import { ContextSelector } from '../koishi.interfaces';

export function applySelector(
  ctx: Context,
  selector: ContextSelector,
): Context {
  if (!selector) {
    return ctx;
  }
  let targetCtx = ctx;
  if (selector.select) {
    targetCtx = targetCtx.select(selector.select);
  }
  if (selector.useSelector) {
    targetCtx = selector.useSelector(targetCtx) || targetCtx;
  }
  return targetCtx;
}
