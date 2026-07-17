// src/shared/utils.ts
// Pure utility functions — zero deps

// Debounce: fires once after wait ms since last call
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  wait: number
): T & { cancel(): void; flush(): void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: unknown[] | null = null;

  const debounced = ((...args: unknown[]) => {
    lastArgs = args;
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      timeoutId = null;
      fn(...(lastArgs ?? []));
      lastArgs = null;
    }, wait);
  }) as T & { cancel(): void; flush(): void };

  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
      lastArgs = null;
    }
  };

  debounced.flush = () => {
    if (timeoutId && lastArgs) {
      clearTimeout(timeoutId);
      timeoutId = null;
      fn(...lastArgs);
      lastArgs = null;
    }
  };

  return debounced;
}

// Throttle: fires at most once per wait ms
export function throttle<T extends (...args: unknown[]) => void>(
  fn: T,
  wait: number
): T & { cancel(): void } {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: unknown[] | null = null;

  const throttled = ((...args: unknown[]) => {
    lastArgs = args;
    const now = Date.now();
    const remaining = wait - (now - lastCall);

    if (remaining <= 0) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      lastCall = now;
      fn(...args);
    } else {
      timeoutId ??= setTimeout(() => {
        timeoutId = null;
        lastCall = Date.now();
        if (lastArgs) fn(...lastArgs);
      }, remaining);
    }
  }) as T & { cancel(): void };

  throttled.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    lastArgs = null;
  };

  return throttled;
}

// UUID v4 generator
export function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Format error for logging
export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}\n${error.stack ?? ''}`;
  }
  return String(error);
}

// Parse Liquid file path
export function parseLiquidUrl(path: string): {
  directory: string;
  name: string;
  extension: string;
  full: string;
} {
  const regex = /^(.+\/)?([^/]+)\.([^.]+)$/;
  const match = regex.exec(path);
  if (!match) {
    return { directory: '', name: path, extension: '', full: path };
  }
  return {
    directory: match[1]?.slice(0, -1) ?? '',
    name: match[2],
    extension: match[3],
    full: match[0],
  };
}

// Detect Liquid template type from path
export function detectLiquidType(path: string): 'section' | 'layout' | 'template' | 'snippet' | 'config' | 'unknown' {
  if (path.startsWith('sections/')) return 'section';
  if (path.startsWith('layout/')) return 'layout';
  if (path.startsWith('templates/')) return 'template';
  if (path.startsWith('snippets/')) return 'snippet';
  if (path.startsWith('config/')) return 'config';
  return 'unknown';
}