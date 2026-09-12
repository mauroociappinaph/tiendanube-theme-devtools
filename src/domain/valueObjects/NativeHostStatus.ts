// src/domain/valueObjects/NativeHostStatus.ts
export type NativeHostStatusValue = 'connected' | 'disconnected' | 'unavailable' | 'connecting';

export class NativeHostStatus {
  private readonly _value: NativeHostStatusValue;

  private constructor(value: NativeHostStatusValue) {
    this._value = value;
  }

  static connected(): NativeHostStatus {
    return new NativeHostStatus('connected');
  }

  static disconnected(): NativeHostStatus {
    return new NativeHostStatus('disconnected');
  }

  static unavailable(): NativeHostStatus {
    return new NativeHostStatus('unavailable');
  }

  static connecting(): NativeHostStatus {
    return new NativeHostStatus('connecting');
  }

  get value(): NativeHostStatusValue {
    return this._value;
  }

  isConnected(): boolean {
    return this._value === 'connected';
  }

  isDisconnected(): boolean {
    return this._value === 'disconnected';
  }

  isUnavailable(): boolean {
    return this._value === 'unavailable';
  }

  toString(): string {
    return this._value;
  }
}