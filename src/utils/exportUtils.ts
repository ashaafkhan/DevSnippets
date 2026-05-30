import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Snippet } from '../database/db';
import { DIRECTORIES } from './fileUtils';

export const exportSingleSnippet = async (
  snippet: Snippet,
  format: 'txt' | 'js' | 'json'
): Promise<string | null> => {
  try {
    const cleanTitle = snippet.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileName = `${cleanTitle}.${format}`;
    const targetPath = `${DIRECTORIES.exports}${fileName}`;
    
    let fileContent = '';
    
    if (format === 'txt') {
      fileContent = `Title: ${snippet.title}
Language: ${snippet.language}
Tags: ${snippet.tags || 'None'}
Created: ${snippet.created_at}
==================================================
${snippet.code}`;
    } else if (format === 'js') {
      fileContent = `/**
 * Title: ${snippet.title}
 * Language: ${snippet.language}
 * Tags: ${snippet.tags || 'None'}
 * Created: ${snippet.created_at}
 */

${snippet.code}`;
    } else if (format === 'json') {
      fileContent = JSON.stringify(snippet, null, 2);
    }
    
    await FileSystem.writeAsStringAsync(targetPath, fileContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    
    return targetPath;
  } catch (e) {
    console.error('Failed to export snippet', e);
    return null;
  }
};

export const exportAllSnippets = async (snippets: Snippet[]): Promise<string | null> => {
  try {
    const timestamp = Date.now();
    const fileName = `snippets_export_${timestamp}.json`;
    const targetPath = `${DIRECTORIES.exports}${fileName}`;
    
    const fileContent = JSON.stringify(snippets, null, 2);
    await FileSystem.writeAsStringAsync(targetPath, fileContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    
    return targetPath;
  } catch (e) {
    console.error('Failed to export all snippets', e);
    return null;
  }
};

export const shareFile = async (filePath: string): Promise<boolean> => {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      alert('Sharing is not available on this device');
      return false;
    }
    await Sharing.shareAsync(filePath);
    return true;
  } catch (e) {
    console.error('Sharing failed', e);
    return false;
  }
};
