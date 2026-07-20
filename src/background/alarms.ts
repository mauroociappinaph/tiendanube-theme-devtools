// src/background/alarms.ts
// Background alarm management for periodic tasks

import { createLogger } from '@shared/logger';

const logger = createLogger('background:alarms');

export const ALARM_NAMES = {
  NATIVE_HOST_HEALTH: 'native-host-health',
  THEME_RELOAD_CHECK: 'theme-reload-check'
} as const;

export type AlarmName = typeof ALARM_NAMES[keyof typeof ALARM_NAMES];

const ALARM_CONFIGS: Record<AlarmName, { periodInMinutes: number }> = {
  [ALARM_NAMES.NATIVE_HOST_HEALTH]: { periodInMinutes: 0.5 }, // 30 seconds
  [ALARM_NAMES.THEME_RELOAD_CHECK]: { periodInMinutes: 5 }
};

export async function createAll(): Promise<void> {
  await Promise.all(
    Object.entries(ALARM_CONFIGS).map(([name, config]) => {
      chrome.alarms.create(name, { periodInMinutes: config.periodInMinutes });
      logger.debug('Alarm created', { name, periodInMinutes: config.periodInMinutes });
    })
  );
}

export async function clearAll(): Promise<void> {
  await chrome.alarms.clearAll();
  logger.info('All alarms cleared');
}

export function onAlarm(name: AlarmName, handler: () => Promise<void>): void {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === name) {
      const promise = handler();
      promise.catch((error: unknown) => {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error(`Alarm handler failed for ${name}`, err);
      });
    }
  });
}

export async function getNextRun(name: AlarmName): Promise<number | null> {
  const alarm = await chrome.alarms.get(name);
  return alarm?.scheduledTime ?? null;
}