import { app, BrowserWindow, ipcMain, dialog } from "electron";
import * as path from "path";
import * as fs from "fs";
import { setupAIService } from "../src/services/aiService";
import { setupFileService } from "../src/services/fileService";
import { setupConfigService } from "../src/services/configService";

// Stores the main application window
let mainWindow: BrowserWindow | null = null;

/**
 * Creates the main application window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Loads the main HTML file
  mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));

  // Opens DevTools during development
  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Initializes app when Electron is ready
app.whenReady().then(() => {
  // Setup services
  setupConfigService();
  setupAIService();
  setupFileService();

  createWindow();

  app.on("activate", () => {
    // Re-creates window on macOS when dock icon is clicked
    if (mainWindow === null) createWindow();
  });
});

// Quits the app when all windows are closed (except on macOS)
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// IPC handlers for file operations
ipcMain.handle(
  "save-file",
  async (_, content: string, filePath: string | null) => {
    try {
      if (!filePath) {
        const { canceled, filePath: selectedPath } =
          await dialog.showSaveDialog({
            defaultPath: "untitled.story",
            filters: [{ name: "Story Files", extensions: ["story"] }],
          });

        if (canceled || !selectedPath) return { success: false };
        filePath = selectedPath;
      }

      fs.writeFileSync(filePath, content);
      return { success: true, filePath };
    } catch (error) {
      console.error("Failed to save file:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
);

ipcMain.handle("open-file", async () => {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "Story Files", extensions: ["story"] }],
    });

    if (canceled || filePaths.length === 0) return { success: false };

    const content = fs.readFileSync(filePaths[0], "utf8");
    return { success: true, content, filePath: filePaths[0] };
  } catch (error) {
    console.error("Failed to open file:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
});

// IPC handlers for app operations
ipcMain.handle("get-app-info", () => {
  return {
    version: app.getVersion(),
    platform: process.platform,
    appPath: app.getAppPath(),
  };
});
