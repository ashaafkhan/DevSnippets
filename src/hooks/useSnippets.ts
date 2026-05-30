import { useState, useEffect, useCallback } from 'react';
import {
  Snippet,
  getAllSnippets,
  getFavorites,
  insertSnippet,
  updateSnippet,
  deleteSnippet,
  toggleFavorite,
  searchSnippets
} from '../database/db';

export const useSnippets = () => {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [favorites, setFavorites] = useState<Snippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('All');

  const refreshSnippets = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch filtered snippets
      const filtered = await searchSnippets(searchQuery, selectedLanguage);
      setSnippets(filtered);

      // 2. Fetch all favorites
      const favs = await getFavorites();
      setFavorites(favs);
    } catch (e) {
      console.error('Failed to load snippets', e);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedLanguage]);

  useEffect(() => {
    refreshSnippets();
  }, [refreshSnippets]);

  const addSnippet = async (
    title: string,
    code: string,
    language: string,
    tags: string,
    isFavorite: boolean
  ) => {
    const newId = await insertSnippet(title, code, language, tags, isFavorite);
    await refreshSnippets();
    return newId;
  };

  const modifySnippet = async (
    id: number,
    title: string,
    code: string,
    language: string,
    tags: string,
    isFavorite: boolean
  ) => {
    await updateSnippet(id, title, code, language, tags, isFavorite);
    await refreshSnippets();
  };

  const removeSnippet = async (id: number) => {
    await deleteSnippet(id);
    await refreshSnippets();
  };

  const toggleFav = async (id: number, currentStatus: boolean) => {
    await toggleFavorite(id, !currentStatus);
    await refreshSnippets();
  };

  return {
    snippets,
    favorites,
    loading,
    searchQuery,
    setSearchQuery,
    selectedLanguage,
    setSelectedLanguage,
    refreshSnippets,
    addSnippet,
    modifySnippet,
    removeSnippet,
    toggleFav,
  };
};
