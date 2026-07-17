// src/shared/command.ts
// Command pattern interfaces (CQRS-lite) for Native Host

import type { Result } from './result';
import type { DomainError } from './errors';

export interface Command {
  readonly name: string;
  readonly payload: unknown;
  readonly correlationId: string;
  readonly timestamp: number;
}

export interface CommandHandler<R> {
  readonly commandName: string;
  execute(command: Command): Promise<Result<R, DomainError>>;
}

export interface Middleware {
  readonly name: string;
  execute<R>(
    command: Command,
    next: () => Promise<Result<R, DomainError>>
  ): Promise<Result<R, DomainError>>;
}

export class CommandBus {
  private handlers = new Map<string, CommandHandler<unknown>>();
  private middlewares: Middleware[] = [];

  register<R>(handler: CommandHandler<R>): void {
    this.handlers.set(handler.commandName, handler);
  }

  use(middleware: Middleware): void {
    this.middlewares.push(middleware);
  }

  async dispatch<R>(command: Command): Promise<Result<R, DomainError>> {
    const handler = this.handlers.get(command.name);
    if (!handler) {
      return {
        _tag: 'Err',
        error: { _tag: 'CommandNotFound', command: command.name },
      };
    }

    const chain = this.middlewares.reduceRight(
      (next, mw) => () => mw.execute(command, next),
      () => handler.execute(command)
    );

    return chain();
  }
}

export const LoggingMiddleware: Middleware = {
  name: 'LoggingMiddleware',
  async execute(command, next) {
    console.debug('[CommandBus] Executing:', command.name, command.correlationId);
    const start = Date.now();
    try {
      const result = await next();
      console.debug('[CommandBus] Completed:', command.name, String(Date.now() - start) + 'ms');
      return result;
    } catch (error) {
      console.error('[CommandBus] Failed:', command.name, error);
      throw error;
    }
  },
};

export const TimingMiddleware: Middleware = {
  name: 'TimingMiddleware',
  async execute(command, next) {
    const start = Date.now();
    const result = await next();
    console.debug('[CommandBus] Timing:', command.name, String(Date.now() - start) + 'ms');
    return result;
  },
};

export const ErrorHandlingMiddleware: Middleware = {
  name: 'ErrorHandlingMiddleware',
  async execute(command, next) {
    try {
      return await next();
    } catch (error) {
      return {
        _tag: 'Err',
        error: {
          _tag: 'InternalError',
          message: error instanceof Error ? error.message : String(error),
          cause: error,
        },
      };
    }
  },
};