// src/domain/valueObjects/LiquidFilePath.ts
// Validated Liquid file path

export class LiquidFilePath {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static create(path: string): { ok: true; value: LiquidFilePath } | { ok: false; error: string } {
    if (!path || typeof path !== 'string') {
      return { ok: false, error: 'Path must be a non-empty string' };
    }
    // Basic validation - no null bytes, reasonable length
    if (path.includes('\0') || path.length > 4096) {
      return { ok: false, error: 'Invalid path' };
    }
    return { ok: true, value: new LiquidFilePath(path) };
  }

  get value(): string {
    return this._value;
  }

  get directory(): string {
    const parts = this._value.split('/');
    return parts.length > 1 ? parts.slice(0, -1).join('/') : '';
  }

  get name(): string {
    const parts = this._value.split('/');
    return parts[parts.length - 1] ?? '';
  }

  get extension(): string {
    const name = this.name;
    const dotIndex = name.lastIndexOf('.');
    return dotIndex > 0 ? name.slice(dotIndex + 1) : '';
  }

  get full(): string {
    return this._value;
  }

  equals(other: LiquidFilePath): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}