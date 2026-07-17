// src/domain/valueObjects/CorrelationId.ts
// UUID v4 wrapper with validation

export class CorrelationId {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static create(): CorrelationId {
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    return new CorrelationId(uuid);
  }

  static fromString(value: string): { ok: true; value: CorrelationId } | { ok: false; error: string } {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      return { ok: false, error: 'Invalid UUID v4 format' };
    }
    return { ok: true, value: new CorrelationId(value) };
  }

  get value(): string {
    return this._value;
  }

  equals(other: CorrelationId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}