import * as FileSystem from 'expo-file-system/legacy';

export const DIRECTORIES = {
  root: FileSystem.documentDirectory || '',
  snippets: `${FileSystem.documentDirectory}snippets/`,
  templates: `${FileSystem.documentDirectory}templates/`,
  exports: `${FileSystem.documentDirectory}exports/`,
  screenshots: `${FileSystem.documentDirectory}screenshots/`,
};

export const ensureDirectoriesExist = async (): Promise<void> => {
  try {
    for (const dir of Object.values(DIRECTORIES)) {
      if (dir) {
        const info = await FileSystem.getInfoAsync(dir);
        if (!info.exists) {
          await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
        }
      }
    }
  } catch (e) {
    console.error('Failed to initialize directories', e);
  }
};

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getDirectorySizeRecursive = async (dirPath: string): Promise<number> => {
  let totalSize = 0;
  try {
    const contents = await FileSystem.readDirectoryAsync(dirPath);
    for (const name of contents) {
      // Avoid recursive loops or missing slashes
      const itemPath = dirPath.endsWith('/') ? `${dirPath}${name}` : `${dirPath}/${name}`;
      const info = await FileSystem.getInfoAsync(itemPath);
      if (info.exists) {
        if (info.isDirectory) {
          totalSize += await getDirectorySizeRecursive(itemPath + '/');
        } else {
          totalSize += info.size || 0;
        }
      }
    }
  } catch (e) {
    // Directory might be empty or inaccessible
  }
  return totalSize;
};

export const copyFileLocal = async (fromUri: string, toDir: string, destFileName: string): Promise<string> => {
  const targetUri = `${toDir}${destFileName}`;
  
  // Resolve conflicts by renaming e.g. snippet_1.png
  let finalUri = targetUri;
  let info = await FileSystem.getInfoAsync(finalUri);
  let counter = 1;
  const nameParts = destFileName.split('.');
  const ext = nameParts.pop() || '';
  const baseName = nameParts.join('.');
  
  while (info.exists) {
    const newName = `${baseName}_${counter}.${ext}`;
    finalUri = `${toDir}${newName}`;
    info = await FileSystem.getInfoAsync(finalUri);
    counter++;
  }
  
  await FileSystem.copyAsync({ from: fromUri, to: finalUri });
  return finalUri;
};
