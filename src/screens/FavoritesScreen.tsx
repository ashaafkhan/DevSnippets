import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  SafeAreaView,
  StatusBar,
  Alert
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../hooks/useTheme';
import { useSnippets } from '../hooks/useSnippets';
import { SnippetCard } from '../components/SnippetCard';
import { EmptyState } from '../components/EmptyState';
import { exportSingleSnippet, shareFile } from '../utils/exportUtils';
import { Snippet } from '../database/db';

type FavScreenNavigationProp = StackNavigationProp<{
  FavList: undefined;
  SnippetDetail: { snippetId: number };
  CreateSnippet: undefined;
  EditSnippet: { snippetId: number };
}>;

export const FavoritesScreen: React.FC = () => {
  const { theme, isDarkMode } = useTheme();
  const navigation = useNavigation<FavScreenNavigationProp>();
  const isFocused = useIsFocused();
  
  const {
    favorites,
    loading,
    refreshSnippets,
    removeSnippet,
    toggleFav
  } = useSnippets();

  useEffect(() => {
    if (isFocused) {
      refreshSnippets();
    }
  }, [isFocused, refreshSnippets]);

  const handleDelete = (id: number) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this snippet?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => removeSnippet(id) }
      ]
    );
  };

  const handleExport = async (snippet: Snippet) => {
    Alert.alert(
      "Export Snippet",
      "Select an export format:",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Plain Text (.txt)", onPress: () => triggerExport(snippet, 'txt') },
        { text: "JavaScript (.js)", onPress: () => triggerExport(snippet, 'js') },
        { text: "JSON (.json)", onPress: () => triggerExport(snippet, 'json') }
      ]
    );
  };

  const triggerExport = async (snippet: Snippet, format: 'txt' | 'js' | 'json') => {
    const path = await exportSingleSnippet(snippet, format);
    if (path) {
      await shareFile(path);
    } else {
      Alert.alert("Error", "Could not export snippet file.");
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />
      
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Favorites</Text>
        </View>

        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <SnippetCard
              snippet={item}
              onPress={() => navigation.navigate('SnippetDetail', { snippetId: item.id })}
              onEdit={() => navigation.navigate('EditSnippet', { snippetId: item.id })}
              onDelete={() => handleDelete(item.id)}
              onExport={() => handleExport(item)}
              onToggleFavorite={() => toggleFav(item.id, item.is_favorite === 1)}
            />
          )}
          contentContainerStyle={styles.listContent}
          onRefresh={refreshSnippets}
          refreshing={loading && favorites.length > 0}
          ListEmptyComponent={
            loading ? null : (
              <EmptyState
                icon="star"
                title="No Favorites"
                message="Star snippets to have them listed here for quick offline access."
              />
            )
          }
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  listContent: {
    paddingBottom: 40,
    flexGrow: 1,
  },
});
