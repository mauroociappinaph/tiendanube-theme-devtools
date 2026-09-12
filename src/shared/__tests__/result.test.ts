import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Result, Ok, Err } from '../result';

describe('Result Pattern - Either Monad', () => {
  describe('Ok (Success) Cases', () => {
    it('should create a success result with primitive value', () => {
      const result = Result.ok(42);
      expect(result).toBeInstanceOf(Ok);
      expect(result.isOk).toBe(true);
      expect(result.isErr).toBe(false);
      expect(result.unwrap()).toBe(42);
    });

    it('should create a success result with object value', () => {
      const data = { id: '123', name: 'Test Theme' };
      const result = Result.ok(data);
      
      expect(result.isOk).toBe(true);
      expect(result.unwrap()).toEqual(data);
      expect(result.unwrap()).toHaveProperty('id');
      expect(result.unwrap()).toHaveProperty('name');
    });

    it('should create a success result with array value', () => {
      const items = ['file1.css', 'file2.js', 'file3.html'];
      const result = Result.ok(items);
      
      expect(result.isOk).toBe(true);
      expect(result.unwrap()).toEqual(items);
      expect(result.unwrap()).toHaveLength(3);
    });

    it('should create a success result with null/undefined values', () => {
      const result1 = Result.ok(null);
      const result2 = Result.ok(undefined);
      
      expect(result1.unwrap()).toBeNull();
      expect(result2.unwrap()).toBeUndefined();
    });

    it('should handle chaining with map on success', () => {
      const result = Result.ok(5)
        .map(x => x * 2)
        .map(x => x + 1);
      
      expect(result.isOk).toBe(true);
      expect(result.unwrap()).toBe(11);
    });

    it('should handle chaining with map on success with object', () => {
      const result = Result.ok({ value: 10 })
        .map(obj => ({ ...obj, doubled: obj.value * 2 }));
      
      expect(result.isOk).toBe(true);
      expect(result.unwrap()).toEqual({ value: 10, doubled: 20 });
    });

    it('should handle flatMap on success', () => {
      const result = Result.ok(5)
        .flatMap(x => Result.ok(x * 3));
      
      expect(result.isOk).toBe(true);
      expect(result.unwrap()).toBe(15);
    });

    it('should handle mapError on success (should not execute)', () => {
      const result = Result.ok(42)
        .mapError(err => new Error('This should not be called'));
      
      expect(result.isOk).toBe(true);
      expect(result.unwrap()).toBe(42);
    });

    it('should handle match on success', () => {
      const result = Result.ok('success value');
      const callback = vi.fn();
      const errorCallback = vi.fn();
      
      result.match(callback, errorCallback);
      
      expect(callback).toHaveBeenCalledOnce();
      expect(callback).toHaveBeenCalledWith('success value');
      expect(errorCallback).not.toHaveBeenCalled();
    });
  });

  describe('Err (Error) Cases', () => {
    it('should create an error result with Error instance', () => {
      const error = new Error('Something went wrong');
      const result = Result.err(error);
      
      expect(result).toBeInstanceOf(Err);
      expect(result.isOk).toBe(false);
      expect(result.isErr).toBe(true);
      expect(() => result.unwrap()).toThrow('Something went wrong');
    });

    it('should create an error result with string message', () => {
      const result = Result.err('Validation failed');
      
      expect(result.isErr).toBe(true);
      expect(() => result.unwrap()).toThrow('Validation failed');
    });

    it('should create an error result with custom error class', () => {
      class ValidationError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'ValidationError';
        }
      }
      
      const error = new ValidationError('Invalid email format');
      const result = Result.err(error);
      
      expect(result.isErr).toBe(true);
      expect(() => result.unwrap()).toThrow('Invalid email format');
    });

    it('should handle chaining with map on error (should not execute)', () => {
      const error = new Error('Original error');
      const result = Result.err(error)
        .map(x => x * 2); // This should not execute
      
      expect(result.isErr).toBe(true);
      expect(() => result.unwrap()).toThrow('Original error');
    });

    it('should handle mapError on error', () => {
      const originalError = new Error('Original error');
      const result = Result.err(originalError)
        .mapError(err => new Error(`Wrapped: ${err.message}`));
      
      expect(result.isErr).toBe(true);
      expect(() => result.unwrap()).toThrow('Wrapped: Original error');
    });

    it('should handle flatMap on error (should not execute)', () => {
      const error = new Error('Original error');
      const result = Result.err(error)
        .flatMap(x => Result.ok(x * 2)); // This should not execute
      
      expect(result.isErr).toBe(true);
      expect(() => result.unwrap()).toThrow('Original error');
    });

    it('should handle match on error', () => {
      const error = new Error('Failed to load');
      const result = Result.err(error);
      const callback = vi.fn();
      const errorCallback = vi.fn();
      
      result.match(callback, errorCallback);
      
      expect(callback).not.toHaveBeenCalled();
      expect(errorCallback).toHaveBeenCalledOnce();
      expect(errorCallback).toHaveBeenCalledWith(error);
    });

    it('should preserve error context through chaining', () => {
      const error = new Error('Database connection failed');
      const result = Result.err(error);
      
      expect(result.error).toBe(error);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('Database connection failed');
    });
  });

  describe('Static Methods', () => {
    it('should create Ok from static ok method', () => {
      const result = Result.ok(100);
      expect(result.isOk).toBe(true);
      expect(result.unwrap()).toBe(100);
    });

    it('should create Err from static err method', () => {
      const result = Result.err(new Error('Static error'));
      expect(result.isErr).toBe(true);
      expect(() => result.unwrap()).toThrow('Static error');
    });

    it('should create from promise with ok result', async () => {
      const promise = Promise.resolve(42);
      const result = await Result.fromPromise(promise);
      
      expect(result.isOk).toBe(true);
      expect(result.unwrap()).toBe(42);
    });

    it('should create from promise with error result', async () => {
      const promise = Promise.reject(new Error('Promise rejected'));
      const result = await Result.fromPromise(promise);
      
      expect(result.isErr).toBe(true);
      expect(() => result.unwrap()).toThrow('Promise rejected');
    });

    it('should create from promise with async/await', async () => {
      const asyncFunction = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'async result';
      };
      
      const result = await Result.fromPromise(asyncFunction());
      expect(result.isOk).toBe(true);
      expect(result.unwrap()).toBe('async result');
    });
  });

  describe('Error Handling Patterns', () => {
    it('should handle nested Result types', () => {
      const nestedResult = Result.ok(Result.ok(Result.ok('deep value')));
      
      // Flatten nested results
      const flattened = nestedResult.flat();
      expect(flattened.isOk).toBe(true);
      expect(flattened.unwrap()).toBe('deep value');
    });

    it('should handle Result with undefined success value', () => {
      const result = Result.ok(undefined);
      expect(result.isOk).toBe(true);
      expect(result.unwrap()).toBeUndefined();
    });

    it('should handle Result with null success value', () => {
      const result = Result.ok(null);
      expect(result.isOk).toBe(true);
      expect(result.unwrap()).toBeNull();
    });

    it('should handle Result with complex object structure', () => {
      const complexData = {
        user: {
          id: 'user-123',
          profile: {
            name: 'John Doe',
            email: 'john@example.com',
            settings: {
              theme: 'dark',
              notifications: true
            }
          }
        },
        metadata: {
          createdAt: new Date('2024-01-01'),
          version: '1.0.0'
        }
      };
      
      const result = Result.ok(complexData);
      expect(result.isOk).toBe(true);
      expect(result.unwrap()).toEqual(complexData);
      expect(result.unwrap().user.profile.settings.theme).toBe('dark');
    });

    it('should handle multiple sequential operations with error propagation', () => {
      const result1 = Result.ok(10);
      const result2 = result1.map(x => x + 5);
      const result3 = result2.flatMap(x => Result.ok(x * 2));
      
      expect(result3.isOk).toBe(true);
      expect(result3.unwrap()).toBe(30);
      
      // If any step fails, the chain breaks
      const failingChain = Result.ok(10)
        .map(x => x + 5)
        .flatMap(x => Result.err(new Error('Chain broken')))
        .map(x => x * 2);
      
      expect(failingChain.isErr).toBe(true);
    });
  });

  describe('Type Safety', () => {
    it('should maintain type information for Ok', () => {
      const result: Result<number, Error> = Result.ok(42);
      expect(result.isOk).toBe(true);
      const value: number = result.unwrap();
      expect(value).toBe(42);
      expect(typeof value).toBe('number');
    });

    it('should maintain type information for Err', () => {
      const result: Result<string, Error> = Result.err(new Error('Type error'));
      expect(result.isErr).toBe(true);
      expect(() => result.unwrap()).toThrow();
    });

    it('should allow type inference with generics', () => {
      const successResult = Result.ok<{ id: string }, Error>({ id: '123' });
      const errorResult = Result.err<never, Error>(new Error('Type inference test'));
      
      expect(successResult.isOk).toBe(true);
      expect(errorResult.isErr).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty strings as success values', () => {
      const result = Result.ok('');
      expect(result.isOk).toBe(true);
      expect(result.unwrap()).toBe('');
    });

    it('should handle zero as success value', () => {
      const result = Result.ok(0);
      expect(result.isOk).toBe(true);
      expect(result.unwrap()).toBe(0);
    });

    it('should handle false as success value', () => {
      const result = Result.ok(false);
      expect(result.isOk).toBe(true);
      expect(result.unwrap()).toBe(false);
    });

    it('should handle NaN as success value', () => {
      const result = Result.ok(NaN);
      expect(result.isOk).toBe(true);
      expect(Number.isNaN(result.unwrap())).toBe(true);
    });

    it('should handle very large numbers', () => {
      const largeNumber = Number.MAX_SAFE_INTEGER;
      const result = Result.ok(largeNumber);
      expect(result.isOk).toBe(true);
      expect(result.unwrap()).toBe(largeNumber);
    });

    it('should handle empty arrays', () => {
      const result = Result.ok([]);
      expect(result.isOk).toBe(true);
      expect(result.unwrap()).toEqual([]);
    });

    it('should handle empty objects', () => {
      const result = Result.ok({});
      expect(result.isOk).toBe(true);
      expect(result.unwrap()).toEqual({});
    });
  });

  describe('Real-world Usage Patterns', () => {
    it('should simulate a real API call returning Result', async () => {
      const fetchData = async (url: string): Promise<Result<{ data: string }, Error>> => {
        if (url.includes('error')) {
          return Result.err(new Error('Failed to fetch'));
        }
        return Result.ok({ data: 'Mock data' });
      };

      // Success case
      const successResult = await fetchData('https://api.example.com/data');
      expect(successResult.isOk).toBe(true);
      expect(successResult.unwrap().data).toBe('Mock data');

      // Error case
      const errorResult = await fetchData('https://api.example.com/error');
      expect(errorResult.isErr).toBe(true);
    });

    it('should simulate validation returning Result', () => {
      const validateEmail = (email: string): Result<string, Error> => {
        if (!email.includes('@')) {
          return Result.err(new Error('Invalid email format'));
        }
        return Result.ok(email);
      };

      const validEmail = validateEmail('test@example.com');
      expect(validEmail.isOk).toBe(true);
      expect(validEmail.unwrap()).toBe('test@example.com');

      const invalidEmail = validateEmail('invalid-email');
      expect(invalidEmail.isErr).toBe(true);
    });

    it('should simulate configuration loading returning Result', () => {
      const loadConfig = (): Result<{ theme: string }, Error> => {
        try {
          // Simulate config loading
          const config = { theme: 'dark' };
          return Result.ok(config);
        } catch (error) {
          return Result.err(new Error('Failed to load config'));
        }
      };

      const configResult = loadConfig();
      expect(configResult.isOk).toBe(true);
      expect(configResult.unwrap().theme).toBe('dark');
    });
  });
});