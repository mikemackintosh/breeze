import Store from "electron-store";
import { ipcMain } from "electron";

// Interface for AI provider configuration
export interface AIProviderConfig {
  provider: "openai" | "anthropic";
  openaiApiKey?: string;
  openaiModel?: string;
  anthropicApiKey?: string;
  anthropicModel?: string;
}

// App configuration interface
export interface AppConfig {
  aiProvider: AIProviderConfig;
  theme?: "light" | "dark";
  fontSize?: number;
  autosaveInterval?: number;
  lastOpenedFilePath?: string;
  autoLoadLastFile?: boolean;
}

// Default configuration
const defaultConfig: AppConfig = {
  aiProvider: {
    provider: "openai",
    openaiModel: "gpt-4-turbo",
    anthropicModel: "claude-3-5-sonnet",
  },
  theme: "light",
  fontSize: 16,
  autosaveInterval: 5,
  lastOpenedFilePath: "",
  autoLoadLastFile: true,
};

// Creates a secure store for configuration
const store = new Store<AppConfig>({
  name: "app-config",
  defaults: defaultConfig,
  encryptionKey: "author-app-secure-key", // Basic encryption for API keys
});

/**
 * Sets up configuration service and IPC handlers
 */
export function setupConfigService() {
  // Gets entire config
  ipcMain.handle("get-config", () => {
    return store.store;
  });

  // Updates config
  ipcMain.handle("update-config", (_, config: Partial<AppConfig>) => {
    // Merges with existing config
    const updatedConfig = { ...store.store, ...config };
    store.set(updatedConfig);
    return store.store;
  });

  // Updates AI provider config
  ipcMain.handle(
    "update-ai-config",
    (_, aiConfig: Partial<AIProviderConfig>) => {
      const currentConfig = store.get("aiProvider");
      const updatedConfig = { ...currentConfig, ...aiConfig };
      store.set("aiProvider", updatedConfig);
      return updatedConfig;
    }
  );

  // Gets current AI provider config
  ipcMain.handle("get-ai-config", () => {
    return store.get("aiProvider");
  });
  
  // Update last opened file path
  ipcMain.handle("update-last-opened-file", (_, filePath: string) => {
    store.set("lastOpenedFilePath", filePath);
    return true;
  });
  
  // Get last opened file path
  ipcMain.handle("get-last-opened-file", () => {
    return store.get("lastOpenedFilePath");
  });
  
  // Get auto-load last file setting
  ipcMain.handle("get-auto-load-last-file", () => {
    return store.get("autoLoadLastFile");
  });
  
  // Toggle auto-load last file setting
  ipcMain.handle("toggle-auto-load-last-file", () => {
    const currentSetting = store.get("autoLoadLastFile");
    store.set("autoLoadLastFile", !currentSetting);
    return !currentSetting;
  });
}

/**
 * Gets the current AI configuration
 */
export function getAIConfig(): AIProviderConfig {
  return store.get("aiProvider");
}

/**
 * Updates the last opened file path
 */
export function updateLastOpenedFile(filePath: string) {
  store.set("lastOpenedFilePath", filePath);
}

/**
 * Gets the last opened file path
 */
export function getLastOpenedFilePath(): string {
  return store.get("lastOpenedFilePath") || "";
}

/**
 * Gets the auto-load last file setting
 */
export function getAutoLoadLastFile(): boolean {
  return store.get("autoLoadLastFile") ?? true;
}
