// src/shared/__tests__/ports.test.ts
import { describe, it, expect, vi } from 'vitest';
import type { StoragePort, StorageSchema, StorageArea } from '../ports/StoragePort';
import type { NativeHostPort, HealthResult } from '../ports/NativeHostPort';
import type { MessagingPort } from '../ports/MessagingPort';

describe('StoragePort interface', () => {
  it('should define all required methods', () => {
    const mockPort: StoragePort = {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
      observe: vi.fn(),
      migrate: vi.fn(),
    };

    expect(typeof mockPort.get).toBe('function');
    expect(typeof mockPort.set).toBe('function');
    expect(typeof mockPort.remove).toBe('function');
    expect(typeof mockPort.clear).toBe('function');
    expect(typeof mockPort.observe).toBe('function');
    expect(typeof mockPort.migrate).toBe('function');
  });

  it('StorageSchema has required fields', () => {
    const schema: StorageSchema = {
      mode: 'local',
      themePath: '/path/to/theme',
      inspectMode: false,
      schemaVersion: '1.0.0',
    };
    expect(schema.mode).toBe('local');
    expect(schema.themePath).toBe('/path/to/theme');
    expect(schema.inspectMode).toBe(false);
    expect(schema.schemaVersion).toBe('1.0.0');
  });

  it('StorageArea type is valid', () => {
    const areas: StorageArea[] = ['local', 'sync', 'session'];
    expect(areas).toEqual(['local', 'sync', 'session']);
  });
});

describe('NativeHostPort interface', () => {
  it('should define all required methods', () => {
    const mockPort: NativeHostPort = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      send: vi.fn(),
      onNotification: vi.fn(),
      healthCheck: vi.fn(),
    };

    expect(typeof mockPort.connect).toBe('function');
    expect(typeof mockPort.disconnect).toBe('function');
    expect(typeof mockPort.send).toBe('function');
    expect(typeof mockPort.onNotification).toBe('function');
    expect(typeof mockPort.healthCheck).toBe('function');
  });

  it('HealthResult has required fields', () => {
    const health: HealthResult = {
      status: 'healthy',
      cli: { path: '/usr/bin/nube-cli', version: '1.0.0' },
      permissions: { theme_push: true, theme_preview: true },
      timestamp: Date.now(),
    };
    expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    expect(typeof health.timestamp).toBe('number');
  });
});

describe('MessagingPort interface', () => {
  it('should define all required methods', () => {
    const mockPort: MessagingPort = {
      send: vi.fn(),
      onMessage: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
    };

    expect(typeof mockPort.send).toBe('function');
    expect(typeof mockPort.onMessage).toBe('function');
    expect(typeof mockPort.connect).toBe('function');
    expect(typeof mockPort.disconnect).toBe('function');
  });
});