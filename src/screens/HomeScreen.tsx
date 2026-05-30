import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useSnippets } from '../hooks/useSnippets';
import { languageList } from '../constants/languages';
import { SearchBar } from '../components/SearchBar';
import { SnippetCard } from '../components/SnippetCard';
import { FAB } from '../components/FAB';
import { EmptyState } from '../components/EmptyState';
import { exportSingleSnippet, shareFile } from '../utils/exportUtils';
import { Snippet } from '../database/db';

type HomeScreenNavigationProp = StackNavigationProp<{
  HomeList: undefined;
  SnippetDetail: { snippetId: number };
  CreateSnippet: undefined;
  EditSnippet: { snippetId: number };
}>;

export const HomeScreen: React.FC = () => {
  const { theme, isDarkMode } = useTheme();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const isFocused = useIsFocused();
  const {
    snippets,
    loading,
    searchQuery,
    setSearchQuery,
    selectedLanguage,
    setSelectedLanguage,
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

  const renderChip = (lang: string) => {
    const isActive = selectedLanguage === lang;
    return (
      <TouchableOpacity
        key={lang}
        style={[
          styles.chip,
          {
            backgroundColor: isActive ? theme.primary : isDarkMode ? '#131B2D' : '#E2E8F0',
            borderColor: theme.border,
          }
        ]}
        onPress={() => setSelectedLanguage(lang)}
      >
        <Text
          style={[
            styles.chipText,
            { color: isActive ? '#FFFFFF' : theme.textSecondary }
          ]}
        >
          {lang}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />
      
      <View style={styles.container}>
        {/* Header Block */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {/* Custom Logo Braces Box */}
            <View style={[styles.logoContainer, { backgroundColor: theme.primary }]}>
              <Text style={styles.logoBraces}>{"{ }"}</Text>
            </View>
            <View style={styles.titleContainer}>
              <Text style={[styles.titleDev, { color: theme.textPrimary }]}>
                DevSnippets <Text style={[styles.titleAi, { color: theme.activeTab }]}>AI</Text>
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.searchHeaderIcon} onPress={() => {}}>
            <Feather name="search" size={20} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Custom search bar */}
        <SearchBar value={searchQuery} onChangeText={setSearchQuery} />

        {/* Languages horizontal chip selector */}
        <View style={styles.chipsOuter}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {renderChip('All')}
            {languageList.map(lang => renderChip(lang))}
          </ScrollView>
        </View>

        {/* Snippet Card List */}
        <FlatList
          data={snippets}
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
          refreshing={loading && snippets.length > 0}
          ListEmptyComponent={
            loading ? null : (
              <EmptyState
                icon="code"
                title="No Snippets Found"
                message={
                  searchQuery || selectedLanguage !== 'All'
                    ? "Try adjusting your search filters to find snippets."
                    : "Create your first developer code snippet to save it offline!"
                }
                actionLabel={searchQuery || selectedLanguage !== 'All' ? "Reset Filters" : "Add Snippet"}
                onActionPress={() => {
                  if (searchQuery || selectedLanguage !== 'All') {
                    setSearchQuery('');
                    setSelectedLanguage('All');
                  } else {
                    navigation.navigate('CreateSnippet');
                  }
                }}
              />
            )
          }
        />

        {/* Floating action button */}
        <FAB onPress={() => navigation.navigate('CreateSnippet')} />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  logoBraces: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  titleContainer: {
    justifyContent: 'center',
  },
  titleDev: {
    fontSize: 20,
    fontWeight: '800',
  },
  titleAi: {
    fontWeight: '900',
  },
  searchHeaderIcon: {
    padding: 6,
  },
  chipsOuter: {
    marginBottom: 8,
  },
  chipsScroll: {
    alignItems: 'center',
    paddingRight: 16,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 100,
    flexGrow: 1,
  },
});
