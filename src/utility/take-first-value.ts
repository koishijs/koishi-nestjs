import { Observable } from 'rxjs';

export function takeFirstValue<T>(obs: Observable<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let resolved = false;
    obs.subscribe({
      next: (value) => {
        if (!resolved) {
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
          resolve(undefined);
          resolved = true;
        }
      },
    });
  });
}
