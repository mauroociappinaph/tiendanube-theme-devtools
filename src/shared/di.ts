// src/shared/di.ts
// Lightweight DI container — zero deps
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type Token<T> = string & { readonly __brand: unique symbol };

export function createToken<T>(name: string): Token<T> {
  return name as Token<T>;
}

export interface Container {
  register<T>(token: Token<T>, factory: (container: Container) => T): void;
  registerInstance<T>(token: Token<T>, instance: T): void;
  resolve<T>(token: Token<T>): T;
  has(token: Token<unknown>): boolean;
}

export function createContainer(): Container {
  const factories = new Map<Token<unknown>, (container: Container) => unknown>();
  const instances = new Map<Token<unknown>, unknown>();

  return {
    register<T>(token: Token<T>, factory: (container: Container) => T): void {
      factories.set(token, factory);
      instances.delete(token);
    },
    registerInstance<T>(token: Token<T>, instance: T): void {
      instances.set(token, instance);
      factories.delete(token);
    },
    resolve<T>(token: Token<T>): T {
      if (instances.has(token)) {
        return instances.get(token) as T;
      }
      const factory = factories.get(token);
      if (!factory) {
        throw new Error(`No registration for token: ${String(token)}`);
      }
      const instance = factory(this) as T;
      instances.set(token, instance);
      return instance;
    },
    has(token: Token<unknown>): boolean {
      return factories.has(token) || instances.has(token);
    },
  };
}