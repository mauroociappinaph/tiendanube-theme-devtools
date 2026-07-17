// src/shared/config.ts
// Centralized configuration with Zod validation

import { z } from 'zod';

export const ExtensionConfigSchema = z.object({
  nativeHost: z.object({
    name: z.string().default('com.tiendanube.theme-devtools'),
    maxRetries: z.number().int().positive().default(3),
    retryDelayMs: z.number().int().positive().default(1000),
  }),
  inspect: z.object({
    hoverDebounceMs: z.number().int().positive().default(150),
    maxBadgeLength: z.number().int().positive().default(60),
  }),
  build: z.object({
    version: z.string(),
    buildTime: z.string(),
    mode: z.enum(['development', 'production']),
  }),
});

export type ExtensionConfig = z.infer<typeof ExtensionConfigSchema>;

export function loadExtensionConfig(overrides?: Partial<ExtensionConfig>): ExtensionConfig {
  const raw = {
    nativeHost: { name: 'com.tiendanube.theme-devtools', maxRetries: 3, retryDelayMs: 1000 },
    inspect: { hoverDebounceMs: 150, maxBadgeLength: 60 },
    build: { version: '0.1.0', buildTime: new Date().toISOString(), mode: 'development' as const },
  };
  const merged = deepMerge(raw, overrides ?? {});
  return ExtensionConfigSchema.parse(merged);
}

// Native Host config
export const HostConfigSchema = z.object({
  cli: z.object({
    path: z.string().default('nube-cli'),
    args: z.array(z.string()).default([]),
  }),
  watch: z.object({
    enabled: z.boolean().default(true),
    debounceMs: z.number().int().positive().default(500),
  }),
  security: z.object({
    allowedBases: z.array(z.string()).default(['/home', '/Users', '/tmp']),
    maxPathLength: z.number().int().positive().default(4096),
    forbiddenPatterns: z.array(z.string()).default(['..', '~', '$']),
  }),
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    json: z.boolean().default(true),
  }),
});

export type HostConfig = z.infer<typeof HostConfigSchema>;

export function loadHostConfig(overrides?: Partial<HostConfig>): HostConfig {
  const raw = {
    cli: { path: 'nube-cli', args: [] },
    watch: { enabled: true, debounceMs: 500 },
    security: { allowedBases: ['/home', '/Users', '/tmp'], maxPathLength: 4096, forbiddenPatterns: ['..', '~', '$'] },
    logging: { level: 'info', json: true },
  };
  const merged = deepMerge(raw, overrides ?? {});
  return HostConfigSchema.parse(merged);
}

// Deep merge utility
function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const sourceValue = source[key];
    const targetValue = result[key];
    if (
      sourceValue !== null &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue !== null &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      (result as Record<string, unknown>)[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>
      );
    } else if (sourceValue !== undefined) {
      (result as Record<string, unknown>)[key] = sourceValue;
    }
  }
  return result;
}