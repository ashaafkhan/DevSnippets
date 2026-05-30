import * as SQLite from 'expo-sqlite';
import { MIGRATIONS } from './migrations';

export interface Snippet {
  id: number;
  title: string;
  code: string;
  language: string;
  tags: string | null; // Comma-separated tags e.g. "utility,performance"
  is_favorite: number; // 0 or 1
  created_at: string;
  updated_at: string;
}

export interface AttachedFile {
  id: number;
  snippet_id: number;
  file_uri: string;
  file_name: string | null;
  file_type: string | null;
}

const DB_NAME = 'devsnippets.db';
let dbInstance: SQLite.SQLiteDatabase | null = null;

export const getDb = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
  }
  return dbInstance;
};

export const initDatabase = async (): Promise<void> => {
  const db = await getDb();
  // Enable foreign keys
  await db.execAsync('PRAGMA foreign_keys = ON;');
  
  // Run schemas
  for (const sql of MIGRATIONS) {
    await db.execAsync(sql);
  }
};

// CRUD: Insert
export const insertSnippet = async (
  title: string,
  code: string,
  language: string,
  tags: string = '',
  isFavorite: boolean = false
): Promise<number> => {
  const db = await getDb();
  const isFavVal = isFavorite ? 1 : 0;
  
  const result = await db.runAsync(
    `INSERT INTO snippets (title, code, language, tags, is_favorite, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'));`,
    [title, code, language, tags, isFavVal]
  );
  
  return result.lastInsertRowId;
};

// CRUD: Get All
export const getAllSnippets = async (): Promise<Snippet[]> => {
  const db = await getDb();
  return await db.getAllAsync<Snippet>('SELECT * FROM snippets ORDER BY updated_at DESC;');
};

// CRUD: Get Favorites
export const getFavorites = async (): Promise<Snippet[]> => {
  const db = await getDb();
  return await db.getAllAsync<Snippet>('SELECT * FROM snippets WHERE is_favorite = 1 ORDER BY updated_at DESC;');
};

// CRUD: Get One
export const getSnippetById = async (id: number): Promise<{ snippet: Snippet | null; files: AttachedFile[] }> => {
  const db = await getDb();
  const snippet = await db.getFirstAsync<Snippet>('SELECT * FROM snippets WHERE id = ?;', [id]);
  if (!snippet) {
    return { snippet: null, files: [] };
  }
  const files = await db.getAllAsync<AttachedFile>('SELECT * FROM attached_files WHERE snippet_id = ?;', [id]);
  return { snippet, files };
};

// CRUD: Update
export const updateSnippet = async (
  id: number,
  title: string,
  code: string,
  language: string,
  tags: string,
  isFavorite: boolean
): Promise<void> => {
  const db = await getDb();
  const isFavVal = isFavorite ? 1 : 0;
  await db.runAsync(
    `UPDATE snippets 
     SET title = ?, code = ?, language = ?, tags = ?, is_favorite = ?, updated_at = datetime('now')
     WHERE id = ?;`,
    [title, code, language, tags, isFavVal, id]
  );
};

// CRUD: Delete
export const deleteSnippet = async (id: number): Promise<void> => {
  const db = await getDb();
  await db.runAsync('DELETE FROM snippets WHERE id = ?;', [id]);
};

// CRUD: Search & Filter
export const searchSnippets = async (query: string, languageFilter: string = 'All'): Promise<Snippet[]> => {
  const db = await getDb();
  let sql = 'SELECT * FROM snippets WHERE 1=1';
  const params: any[] = [];

  if (languageFilter !== 'All') {
    sql += ' AND language = ?';
    params.push(languageFilter);
  }

  if (query.trim().length > 0) {
    sql += ' AND (title LIKE ? OR tags LIKE ?)';
    const searchParam = `%${query.trim()}%`;
    params.push(searchParam, searchParam);
  }

  sql += ' ORDER BY updated_at DESC;';
  return await db.getAllAsync<Snippet>(sql, params);
};

// CRUD: Toggle Favorite Status
export const toggleFavorite = async (id: number, isFavorite: boolean): Promise<void> => {
  const db = await getDb();
  const isFavVal = isFavorite ? 1 : 0;
  await db.runAsync(
    `UPDATE snippets SET is_favorite = ?, updated_at = datetime('now') WHERE id = ?;`,
    [isFavVal, id]
  );
};

// --- Attached Files Queries ---
export const insertAttachedFile = async (
  snippetId: number,
  fileUri: string,
  fileName: string,
  fileType: string
): Promise<number> => {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO attached_files (snippet_id, file_uri, file_name, file_type) VALUES (?, ?, ?, ?);`,
    [snippetId, fileUri, fileName, fileType]
  );
  return result.lastInsertRowId;
};

export const getAttachedFiles = async (snippetId: number): Promise<AttachedFile[]> => {
  const db = await getDb();
  return await db.getAllAsync<AttachedFile>('SELECT * FROM attached_files WHERE snippet_id = ?;', [snippetId]);
};

export const deleteAttachedFile = async (id: number): Promise<void> => {
  const db = await getDb();
  await db.runAsync('DELETE FROM attached_files WHERE id = ?;', [id]);
};
