/**
 * Result Pattern (Either Monad) - Implementación minimalista
 * 
 * Este módulo implementa el patrón Result/Either para manejo de errores
 * funcional en TypeScript. Inspirado en Rust's Result<T, E> y fp-ts.
 * 
 * @module result
 */

/**
 * Clase base para resultados
 */
export class Result<T, E> {
  protected constructor(
    private readonly _value: T,
    private readonly _error: E,
    private readonly _isOk: boolean
  ) {}

  /**
   * Crea un resultado exitoso (Ok)
   * @param value Valor de éxito
   * @returns Instancia de Ok<T, E>
   */
  static ok<T, E>(value: T): Ok<T, E> {
    return new Ok(value);
  }

  /**
   * Crea un resultado de error (Err)
   * @param error Valor de error
   * @returns Instancia de Err<T, E>
   */
  static err<T, E>(error: E): Err<T, E> {
    return new Err(error);
  }

  /**
   * Crea un Result desde una promesa
   * @param promise Promesa a convertir
   * @returns Promise<Result<T, E>>
   */
  static async fromPromise<T, E>(promise: Promise<T>): Promise<Result<T, E>> {
    try {
      const value = await promise;
      return Result.ok(value);
    } catch (error) {
      return Result.err(error as E);
    }
  }

  /**
   * Verifica si el resultado es exitoso
   */
  get isOk(): boolean {
    return this._isOk;
  }

  /**
   * Verifica si el resultado es un error
   */
  get isErr(): boolean {
    return !this._isOk;
  }

  /**
   * Obtiene el valor o lanza un error
   * @returns Valor de éxito
   * @throws Error si es un resultado de error
   */
  unwrap(): T {
    if (this.isErr) {
      throw this._error;
    }
    return this._value;
  }

  /**
   * Aplica una transformación al valor si es Ok
   * @param fn Función de transformación
   * @returns Nuevo Result con el valor transformado
   */
  map<U>(fn: (value: T) => U): Result<U, E> {
    if (this.isOk) {
      return Result.ok(fn(this._value));
    }
    return Result.err(this._error) as unknown as Result<U, E>;
  }

  /**
   * Aplica una transformación que devuelve otro Result
   * @param fn Función que devuelve Result
   * @returns Resultado de la transformación
   */
  flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    if (this.isOk) {
      return fn(this._value);
    }
    return Result.err(this._error) as unknown as Result<U, E>;
  }

  /**
   * Aplica una transformación al error si es Err
   * @param fn Función de transformación de error
   * @returns Nuevo Result con el error transformado
   */
  mapError<F>(fn: (error: E) => F): Result<T, F> {
    if (this.isErr) {
      return Result.err(fn(this._error));
    }
    return Result.ok(this._value) as unknown as Result<T, F>;
  }

  /**
   * Ejecuta callbacks según el tipo de resultado
   * @param okCallback Callback para resultado exitoso
   * @param errCallback Callback para resultado de error
   */
  match<U>(okCallback: (value: T) => U, errCallback: (error: E) => U): U {
    if (this.isOk) {
      return okCallback(this._value);
    }
    return errCallback(this._error);
  }

  /**
   * Aplana resultados anidados
   * @returns Result aplanado
   */
  flat(): Result<unknown, E> {
    if (this.isOk) {
      const value = this._value;
      // Si el valor es otro Result, lo aplanamos
      if (value instanceof Result) {
        return value.flat();
      }
    }
    return this as unknown as Result<unknown, E>;
  }
}

/**
 * Resultado exitoso (Ok)
 */
export class Ok<T, E> extends Result<T, E> {
  constructor(value: T) {
    super(value, null as unknown as E, true);
  }

  /**
   * Obtiene el valor directamente
   */
  get value(): T {
    return this.unwrap();
  }

  /**
   * Obtiene el error (siempre undefined en Ok)
   */
  get error(): undefined {
    return undefined;
  }
}

/**
 * Resultado de error (Err)
 */
export class Err<T, E> extends Result<T, E> {
  constructor(error: E) {
    super(null as unknown as T, error, false);
  }

  /**
   * Obtiene el valor (siempre undefined en Err)
   */
  get value(): undefined {
    return undefined;
  }

  /**
   * Obtiene el error directamente
   */
  get error(): E {
    return this._error;
  }
}


