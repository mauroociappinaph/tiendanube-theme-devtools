// src/domain/valueObjects/ThemeMode.ts
// Type-safe theme mode

export type ThemeModeValue = 'local' | 'remote';

export class ThemeMode {
  private readonly _value: ThemeModeValue;

  private constructor(value: ThemeModeValue) {
    this._value = value;
  }

  static create(value: string): { ok: true; value: ThemeMode } | { ok: false; error: string } {
    if (value === 'local' || value === 'remote') {
      return { ok: true, value: new ThemeMode(value) };
    }
    return { ok: false, error: `Invalid theme mode: ${value}. Must be 'local' or 'remote'` };
  }

  static local(): ThemeMode {
    return new ThemeMode('local');
  }

  static remote(): ThemeMode {
    return new ThemeMode('remote');
  }

  get value(): ThemeModeValue {
    return this._value;
  }

  isLocal(): boolean {
    return this._value === 'local';
  }

  isRemote(): boolean {
    return this._value === 'remote';
  }

  toggle(): ThemeMode {
    return this._value === 'local' ? ThemeMode.remote() : ThemeMode.local();
  }

  toString(): string {
    return this._value;
  }
}