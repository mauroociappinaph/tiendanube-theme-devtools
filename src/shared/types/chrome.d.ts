// src/shared/types/chrome.d.ts
// Chrome API type augmentations — single source of truth for all adapters

// Extend chrome.devtools.panels
declare namespace chrome.devtools.panels {
  interface ExtensionPanel {
    onShown: chrome.events.Event<(window: Window) => void>;
    onHidden: chrome.events.Event<() => void>;
    create(
      title: string,
      iconPath: string,
      pagePath: string
    ): Promise<ExtensionPanel>;
  }

  const elements: {
    createPanel(
      title: string,
      iconPath: string,
      pagePath: string
    ): Promise<ExtensionPanel>;
  };

  const sources: {
    createPanel(
      title: string,
      iconPath: string,
      pagePath: string
    ): Promise<ExtensionPanel>;
  };
}

// Extend chrome.scripting
declare namespace chrome.scripting {
  interface InjectionResult {
    frameId: number;
    result?: unknown;
  }

  interface ScriptInjection {
    files?: string[];
    func?: () => void;
    args?: unknown[];
    target: { tabId: number; frameIds?: number[] };
    world?: 'ISOLATED' | 'MAIN';
  }

  function executeScript(
    injection: ScriptInjection
  ): Promise<InjectionResult[]>;

  interface CSSInjection {
    files?: string[];
    origin?: 'author' | 'user';
    target: { tabId: number; frameIds?: number[] };
  }

  function insertCSS(injection: CSSInjection): Promise<void>;
}

// Extend chrome.storage
declare namespace chrome.storage {
  interface StorageArea {
    get(keys?: string | string[] | object): Promise<object>;
    set(items: object): Promise<void>;
    remove(keys: string | string[]): Promise<void>;
    clear(): Promise<void>;
    getBytesInUse(keys?: string | string[]): Promise<number>;
  }

  const local: StorageArea;
  const sync: StorageArea;
  const session: StorageArea;

  interface StorageChange {
    oldValue?: unknown;
    newValue?: unknown;
  }

  interface StorageChangedEvent {
    addListener(callback: (changes: Record<string, StorageChange>, areaName: string) => void): void;
    removeListener(callback: (changes: Record<string, StorageChange>, areaName: string) => void): void;
  }

  const onChanged: StorageChangedEvent;
}

// Extend chrome.runtime
declare namespace chrome.runtime {
  interface MessageSender {
    tab?: chrome.tabs.Tab;
    frameId?: number;
    id?: string;
    url?: string;
    tlsChannelId?: string;
  }

  interface Port {
    name: string;
    disconnect(): void;
    onDisconnect: chrome.events.Event<(port: Port) => void>;
    onMessage: chrome.events.Event<(message: unknown, port: Port) => void>;
    postMessage(message: unknown): void;
    sender?: MessageSender;
  }

  function connectNative(hostName: string): Port;
  function sendMessage(
    message: unknown,
    options?: { includeTlsChannelId?: boolean }
  ): Promise<unknown>;
  function sendMessage(
    extensionId: string,
    message: unknown,
    options?: { includeTlsChannelId?: boolean }
  ): Promise<unknown>;

  const onMessage: chrome.events.Event<
    (message: unknown, sender: MessageSender, sendResponse: (response?: unknown) => void) => boolean
  >;
  const onMessageExternal: chrome.events.Event<
    (message: unknown, sender: MessageSender, sendResponse: (response?: unknown) => void) => boolean
  >;
  const onConnect: chrome.events.Event<(port: Port) => void>;
  const onConnectExternal: chrome.events.Event<(port: Port) => void>;
  const onInstalled: chrome.events.Event<(details: { reason: 'install' | 'update' | 'chrome_update' | 'shared_module_update'; previousVersion?: string }) => void>;
  const onStartup: chrome.events.Event<() => void>;

  function getManifest(): chrome.runtime.ManifestV3;
  function getURL(path: string): string;
  function getPlatformInfo(): Promise<{ os: 'mac' | 'win' | 'linux' | 'android' | 'cros' }>;

  const lastError: { message: string } | undefined;
}

// Extend chrome.tabs
declare namespace chrome.tabs {
  interface Tab {
    id?: number;
    index: number;
    windowId: number;
    highlighted: boolean;
    active: boolean;
    pinned: boolean;
    url?: string;
    title?: string;
    favIconUrl?: string;
    status?: 'loading' | 'complete';
    width?: number;
    height?: number;
    sessionId?: string;
  }

  function query(queryInfo: { active?: boolean; currentWindow?: boolean; windowId?: number; index?: number; highlighted?: boolean; pinned?: boolean; status?: string; title?: string; url?: string | string[] }): Promise<Tab[]>;
  function sendMessage(tabId: number, message: unknown, options?: { frameId?: number }): Promise<unknown>;
}

// Extend chrome.alarms
declare namespace chrome.alarms {
  interface Alarm {
    name: string;
    scheduledTime: number;
  }

  function create(name: string, alarmInfo: { delayInMinutes?: number; periodInMinutes?: number; when?: number }): void;
  function clear(name?: string): Promise<boolean>;
  function clearAll(): Promise<boolean>;
  function get(name?: string): Promise<Alarm | undefined>;
  function getAll(): Promise<Alarm[]>;

  const onAlarm: chrome.events.Event<(alarm: Alarm) => void>;
}

// Extend chrome.devtools.network
declare namespace chrome.devtools.network {
  interface Request {
    getContent(): Promise<{ content: string; encoding: string }>;
  }

  interface Resource {
    requestId: string;
    url: string;
    method: string;
    status: number;
    requestHeaders: { name: string; value: string }[];
    responseHeaders: { name: string; value: string }[];
  }

  const onRequestFinished: chrome.events.Event<(request: Resource) => void>;
}

// Extend chrome.events
declare namespace chrome.events {
  interface Event<T extends (...args: unknown[]) => void> {
    addListener(callback: T): void;
    removeListener(callback: T): void;
    hasListener(callback: T): boolean;
  }
}