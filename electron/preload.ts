import { contextBridge, ipcRenderer } from "electron";

// Exposes protected APIs to the renderer process
contextBridge.exposeInMainWorld("electronAPI", {
  // File operations
  saveFile: (content: string, filePath: string | null) =>
    ipcRenderer.invoke("save-file", content, filePath),

  openFile: () => ipcRenderer.invoke("open-file"),

  // App information
  getAppInfo: () => ipcRenderer.invoke("get-app-info"),

  // Character management
  saveCharacter: (character: any) =>
    ipcRenderer.invoke("save-character", character),

  getCharacters: () => ipcRenderer.invoke("get-characters"),

  // Location management
  saveLocation: (location: any) =>
    ipcRenderer.invoke("save-location", location),

  getLocations: () => ipcRenderer.invoke("get-locations"),

  // Assets management
  saveAsset: (asset: any) => ipcRenderer.invoke("save-asset", asset),

  getAssets: () => ipcRenderer.invoke("get-assets"),

  // AI integration
  generateAIContent: (prompt: string, context: any) =>
    ipcRenderer.invoke("generate-ai-content", prompt, context),

  // Configuration
  getConfig: () => ipcRenderer.invoke("get-config"),
  updateConfig: (config: any) => ipcRenderer.invoke("update-config", config),
  getAIConfig: () => ipcRenderer.invoke("get-ai-config"),
  updateAIConfig: (config: any) =>
    ipcRenderer.invoke("update-ai-config", config),
});
