// src/shared/__tests__/result.test.ts
import { describe, it, expect } from 'vitest';
import { ok, err, isOk, isErr, unwrap, unwrapErr, map, flatMap, match } from '../result';

describe('Result pattern', () => {
  describe('constructors', () => {
    it('ok() creates Ok variant', () => {
      const result = ok(42);
      expect(result._tag).toBe('Ok');
      expect(result.value).toBe(42);
    });

    it('err() creates Err variant', () => {
      const result = err('error');
      expect(result._tag).toBe('Err');
      expect(result.error).toBe('error');
    });
  });

  describe('type guards', () => {
    it('isOk() narrows to Ok', () => {
      const result = ok(1);
      if (isOk(result)) {
        expect(result.value).toBe(1);
      }
    });

    it('isErr() narrows to Err', () => {
      const result = err('oops');
      if (isErr(result)) {
        expect(result.error).toBe('oops');
      }
    });
  });

  describe('unwrap / unwrapErr', () => {
    it('unwrap() returns value on Ok', () => {
      expect(unwrap(ok(10))).toBe(10);
    });

    it('unwrap() throws on Err', () => {
      expect(() => unwrap(err('fail'))).toThrow('fail');
    });

    it('unwrapErr() returns error on Err', () => {
      expect(unwrapErr(err('bad'))).toBe('bad');
    });

    it('unwrapErr() throws on Ok', () => {
      expect(() => unwrapErr(ok(1))).toThrow('Expected Err');
    });
  });

  describe('map', () => {
    it('transforms Ok value', () => {
      const result = map(ok(2), (x) => x * 3);
      expect(isOk(result) && result.value).toBe(6);
    });

    it('passes through Err unchanged', () => {
      const result = map(err('oops'), (x) => x * 3);
      expect(isErr(result) && result.error).toBe('oops');
    });
  });

  describe('flatMap', () => {
    it('chains Ok to Ok', () => {
      const result = flatMap(ok(2), (x) => ok(x * 5));
      expect(isOk(result) && result.value).toBe(10);
    });

    it('short-circuits on Err', () => {
      const result = flatMap(err('oops'), (x) => ok(x * 5));
      expect(isErr(result) && result.error).toBe('oops');
    });
  });

  describe('match', () => {
    it('calls onOk for Ok', () => {
      const result = match(ok('hello'), (v) => `OK: ${v}`, (e) => `ERR: ${String(e)}`);
      expect(result).toBe('OK: hello');
    });

    it('calls onErr for Err', () => {
      const error = 'fail';
      const result = match<string, string, string>(err(error), (v) => `OK: ${v}`, (e) => `ERR: ${e}`);
      expect(result).toBe('ERR: fail');
    });
  });
});