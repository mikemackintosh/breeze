import { ipcMain, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

// The app's data directory
const dataDir = path.join(
  app.getPath('userData'),
  'data'
);

// Ensures data directories exist
function ensureDirectories() {
  const directories = [
    dataDir,
    path.join(dataDir, 'characters'),
    path.join(dataDir, 'locations'),
    path.join(dataDir, 'assets'),
  ];

  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

/**
 * Sets up file management services and IPC handlers
 */
export function setupFileService() {
  ensureDirectories();

  // Character management
  ipcMain.handle('save-character', async (_, character) => {
    return saveCharacter(character);
  });

  ipcMain.handle('get-characters', async () => {
    return { characters: getCharacters() };
  });

  // Location management
  ipcMain.handle('save-location', async (_, location) => {
    return saveLocation(location);
  });

  ipcMain.handle('get-locations', async () => {
    return { locations: getLocations() };
  });

  // Asset management
  ipcMain.handle('save-asset', async (_, asset) => {
    return saveAsset(asset);
  });

  ipcMain.handle('get-assets', async () => {
    return { assets: getAssets() };
  });
}

/**
 * Saves a character to the data directory
 */
function saveCharacter(character: any): { success: boolean; id: number } {
  try {
    // Assigns an ID if new
    if (!character.id) {
      character.id = Date.now();
    }

    const filePath = path.join(dataDir, 'characters', `${character.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(character, null, 2));

    return { success: true, id: character.id };
  } catch (error) {
    console.error('Failed to save character:', error);
    return { success: false, id: 0 };
  }
}

/**
 * Gets all characters from the data directory
 */
function getCharacters(): any[] {
  try {
    const charactersDir = path.join(dataDir, 'characters');
    const files = fs.readdirSync(charactersDir).filter(file => file.endsWith('.json'));
    
    return files.map(file => {
      const filePath = path.join(charactersDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    });
  } catch (error) {
    console.error('Failed to get characters:', error);
    return [];
  }
}

/**
 * Saves a location to the data directory
 */
function saveLocation(location: any): { success: boolean; id: number } {
  try {
    // Assigns an ID if new
    if (!location.id) {
      location.id = Date.now();
    }

    const filePath = path.join(dataDir, 'locations', `${location.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(location, null, 2));

    return { success: true, id: location.id };
  } catch (error) {
    console.error('Failed to save location:', error);
    return { success: false, id: 0 };
  }
}

/**
 * Gets all locations from the data directory
 */
function getLocations(): any[] {
  try {
    const locationsDir = path.join(dataDir, 'locations');
    const files = fs.readdirSync(locationsDir).filter(file => file.endsWith('.json'));
    
    return files.map(file => {
      const filePath = path.join(locationsDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    });
  } catch (error) {
    console.error('Failed to get locations:', error);
    return [];
  }
}

/**
 * Saves an asset to the data directory
 */
function saveAsset(asset: any): { success: boolean; id: number } {
  try {
    // Assigns an ID if new
    if (!asset.id) {
      asset.id = Date.now();
    }

    // Saves asset metadata
    const metadataPath = path.join(dataDir, 'assets', `${asset.id}.json`);
    fs.writeFileSync(metadataPath, JSON.stringify(asset, null, 2));

    // If the asset includes file data, saves the file
    if (asset.data) {
      const fileExt = path.extname(asset.originalName);
      const filePath = path.join(dataDir, 'assets', `${asset.id}${fileExt}`);
      
      // Converts base64 to binary if needed
      if (asset.data.startsWith('data:')) {
        const base64Data = asset.data.split(',')[1];
        fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
      } else {
        fs.writeFileSync(filePath, asset.data);
      }
      
      // Updates the asset path in metadata
      asset.path = filePath;
      delete asset.data;
      fs.writeFileSync(metadataPath, JSON.stringify(asset, null, 2));
    }

    return { success: true, id: asset.id };
  } catch (error) {
    console.error('Failed to save asset:', error);
    return { success: false, id: 0 };
  }
}

/**
 * Gets all assets from the data directory
 */
function getAssets(): any[] {
  try {
    const assetsDir = path.join(dataDir, 'assets');
    const files = fs.readdirSync(assetsDir).filter(file => file.endsWith('.json'));
    
    return files.map(file => {
      const filePath = path.join(assetsDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    });
  } catch (error) {
    console.error('Failed to get assets:', error);
    return [];
  }
}

/**
 * Creates a project backup
 */
export function createBackup(projectPath: string): boolean {
  try {
    if (!fs.existsSync(projectPath)) return false;
    
    const backupsDir = path.join(
      app.getPath('userData'),
      'backups'
    );
    
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filename = path.basename(projectPath);
    const backupPath = path.join(backupsDir, `${filename}.${timestamp}.bak`);
    
    fs.copyFileSync(projectPath, backupPath);
    return true;
  } catch (error) {
    console.error('Failed to create backup:', error);
    return false;
  }
}
