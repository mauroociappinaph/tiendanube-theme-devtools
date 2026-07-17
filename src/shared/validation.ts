// src/shared/validation.ts
// Zod schemas for all external inputs

import { z } from 'zod';
import type { Result } from './result';
import type { DomainError } from './errors';

// Environment variables
export const EnvSchema = z.object({
  CHROME_WEBSTORE_CLIENT_ID: z.string().min(1),
  CHROME_WEBSTORE_CLIENT_SECRET: z.string().min(1),
  CHROME_WEBSTORE_REFRESH_TOKEN: z.string().min(1),
  NUBE_CLI_PATH: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
});

// Message validation
export const MessageSchema = z.object({
  correlationId: z.string().uuid(),
  timestamp: z.number().int().positive(),
  type: z.string().min(1),
  payload: z.unknown().optional(),
});

// Theme push params
export const ThemePushParamsSchema = z.object({
  themePath: z.string().min(1).max(4096),
  force: z.boolean().optional(),
});

// Generic validator
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): Result<T, DomainError> {
  const result = schema.safeParse(data);
  if (result.success) return { _tag: 'Ok', value: result.data };
  return {
    _tag: 'Err',
    error: {
      _tag: 'ValidationFailed',
      errors: result.error.flatten().fieldErrors,
    },
  };
}