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
}

/**
 * Gets the current AI configuration
 */
export function getAIConfig(): AIProviderConfig {
  return store.get("aiProvider");
}
