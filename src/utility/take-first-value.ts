import { Observable } from 'rxjs';

export function registerAtLeastEach<T extends { key: string }>(
  obs: Observable<T>,
  keys: string[],
): Promise<T> {
  const remainingKeys = new Set(keys);
  return new Promise<T>((resolve, reject) => {
    let resolved = false;
    let lastValue: T = undefined;
    obs.subscribe({
      next: (value) => {
        lastValue = value;
        remainingKeys.delete(value.key);
        if (!resolved && remainingKeys.size === 0) {
          resolve(value);
          resolved = true;
        }
      },
      error: (error) => {
        if (!resolved) {
          reject(error);
          resolved = true;
        }
      },
      complete: () => {
        if (!resolved) {
          resolve(lastValue);
          resolved = true;
        }
      },
    });
  });
}
