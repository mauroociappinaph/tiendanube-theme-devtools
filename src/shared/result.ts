// src/shared/result.ts
// Result/Either pattern (Ok/Err) — zero dependencies

export type Result<T, E> = Ok<T> | Err<E>;

export interface Ok<T> {
  readonly _tag: 'Ok';
  readonly value: T;
}

export interface Err<E> {
  readonly _tag: 'Err';
  readonly error: E;
}

export function ok<T>(value: T): Ok<T> {
  return { _tag: 'Ok', value };
}

export function err<E>(error: E): Err<E> {
  return { _tag: 'Err', error };
}

export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result._tag === 'Ok';
}

export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return result._tag === 'Err';
}

export function unwrap<T, E>(result: Result<T, E>): T {
  if (isOk(result)) return result.value;
  const error = result.error;
  if (error instanceof Error) throw error;
  throw new Error(String(error));
}

export function unwrapErr<T, E>(result: Result<T, E>): E {
  if (isErr(result)) return result.error;
  throw new Error('Expected Err');
}

export function map<T, E, U>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  return isOk(result) ? ok(fn(result.value)) : result;
}

export function flatMap<T, E, U>(result: Result<T, E>, fn: (value: T) => Result<U, E>): Result<U, E> {
  return isOk(result) ? fn(result.value) : result;
}

export function match<T, E, U>(result: Result<T, E>, onOk: (value: T) => U, onErr: (error: E) => U): U {
  return isOk(result) ? onOk(result.value) : onErr(result.error);
}