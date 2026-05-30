import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  TextInput,
  Modal,
  Image,
  Dimensions,
  ScrollView
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { DIRECTORIES, formatBytes, getDirectorySizeRecursive } from '../utils/fileUtils';
import { FileListItem, FileItem } from '../components/FileListItem';
import { EmptyState } from '../components/EmptyState';
import { shareFile } from '../utils/exportUtils';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export const FileManagerScreen: React.FC = () => {
  const { theme, isDarkMode } = useTheme();
  
  const [currentPath, setCurrentPath] = useState<string>(DIRECTORIES.root);
  const [filesList, setFilesList] = useState<FileItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // File Preview Modal
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);
  const [previewTextContent, setPreviewTextContent] = useState<string | null>(null);
  const [previewTextName, setPreviewTextName] = useState<string>('');

  const loadDirectoryContents = useCallback(async () => {
    setLoading(true);
    try {
      const names = await FileSystem.readDirectoryAsync(currentPath);
      const items: FileItem[] = [];

      for (const name of names) {
        const itemPath = currentPath.endsWith('/') ? `${currentPath}${name}` : `${currentPath}/${name}`;
        const info = await FileSystem.getInfoAsync(itemPath);

        if (info.exists) {
          if (info.isDirectory) {
            // Calculate size and count recursively
            const size = await getDirectorySizeRecursive(itemPath + '/');
            const subNames = await FileSystem.readDirectoryAsync(itemPath);
            items.push({
              name,
              uri: itemPath + '/',
              isDirectory: true,
              size,
              fileCount: subNames.length,
              modificationTime: info.modificationTime
            });
          } else {
            items.push({
              name,
              uri: itemPath,
              isDirectory: false,
              size: info.size || 0,
              modificationTime: info.modificationTime
            });
          }
        }
      }
      
      // Sort: Directories first, then alphabetical
      items.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

      setFilesList(items);
    } catch (e) {
      console.error('Failed to read directory', currentPath, e);
      Alert.alert('Error', 'Failed to read directory contents.');
    } finally {
      setLoading(false);
    }
  }, [currentPath]);

  useEffect(() => {
    loadDirectoryContents();
  }, [loadDirectoryContents]);

  const handleGoBack = () => {
    if (currentPath === DIRECTORIES.root) return;
    
    // Remove last folder from path
    const parts = currentPath.split('/');
    // For trailing slash, parts will end with empty string
    if (parts[parts.length - 1] === '') {
      parts.pop();
    }
    parts.pop();
    const parentPath = parts.join('/') + '/';
    setCurrentPath(parentPath);
  };

  const handleItemPress = async (item: FileItem) => {
    if (item.isDirectory) {
      setCurrentPath(item.uri);
    } else {
      // Preview File
      const ext = item.name.split('.').pop()?.toLowerCase();
      const isImg = ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext || '');

      if (isImg) {
        setPreviewImageUri(item.uri);
      } else {
        // Try reading it as text
        try {
          const contents = await FileSystem.readAsStringAsync(item.uri);
          setPreviewTextName(item.name);
          setPreviewTextContent(contents);
        } catch (e) {
          // Fallback: Share file if not readable as text
          shareFile(item.uri);
        }
      }
    }
  };

  const handleDelete = (item: FileItem) => {
    Alert.alert(
      "Confirm Delete",
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await FileSystem.deleteAsync(item.uri, { idempotent: true });
              loadDirectoryContents();
            } catch (e) {
              Alert.alert("Error", "Could not delete item.");
            }
          }
        }
      ]
    );
  };

  const handleCopy = (item: FileItem) => {
    Alert.alert(
      "Copy File",
      `Copy "${item.name}" to directory:`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Templates", onPress: () => performCopy(item, DIRECTORIES.templates) },
        { text: "Exports", onPress: () => performCopy(item, DIRECTORIES.exports) },
        { text: "Screenshots", onPress: () => performCopy(item, DIRECTORIES.screenshots) }
      ]
    );
  };

  const performCopy = async (item: FileItem, targetDir: string) => {
    try {
      const destUri = `${targetDir}${item.name}`;
      
      // Auto rename on conflict
      let finalUri = destUri;
      let info = await FileSystem.getInfoAsync(finalUri);
      let counter = 1;
      const parts = item.name.split('.');
      const ext = parts.pop() || '';
      const base = parts.join('.');

      while (info.exists) {
        finalUri = `${targetDir}${base}_copy_${counter}.${ext}`;
        info = await FileSystem.getInfoAsync(finalUri);
        counter++;
      }

      await FileSystem.copyAsync({ from: item.uri, to: finalUri });
      loadDirectoryContents();
      Alert.alert("Success", "File copied successfully!");
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to copy file.");
    }
  };

  const handleMove = (item: FileItem) => {
    Alert.alert(
      "Move File",
      `Move "${item.name}" to directory:`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Templates", onPress: () => performMove(item, DIRECTORIES.templates) },
        { text: "Exports", onPress: () => performMove(item, DIRECTORIES.exports) },
        { text: "Screenshots", onPress: () => performMove(item, DIRECTORIES.screenshots) }
      ]
    );
  };

  const performMove = async (item: FileItem, targetDir: string) => {
    try {
      const destUri = `${targetDir}${item.name}`;
      await FileSystem.moveAsync({ from: item.uri, to: destUri });
      loadDirectoryContents();
      Alert.alert("Success", "File moved successfully!");
    } catch (e) {
      Alert.alert("Error", "Failed to move file.");
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      // Mock downloading developer templates offline
      const templates = [
        {
          name: 'debounce_helper.js',
          content: `// Debounce implementation template\nfunction debounce(func, wait) {\n  let timeout;\n  return function(...args) {\n    clearTimeout(timeout);\n    timeout = setTimeout(() => func.apply(this, args), wait);\n  };\n}`
        },
        {
          name: 'rest_client.py',
          content: `# Python API request helper\nimport urllib.request\nimport json\n\ndef fetch_json(url):\n  with urllib.request.urlopen(url) as response:\n    return json.loads(response.read().decode())`
        },
        {
          name: 'flexbox_layout.css',
          content: `/* Centered Flexbox Column Layout */\n.flex-center-col {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n}`
        }
      ];

      // Write one random template file into templates folder
      const chosen = templates[Math.floor(Math.random() * templates.length)];
      const targetPath = `${DIRECTORIES.templates}${chosen.name}`;
      await FileSystem.writeAsStringAsync(targetPath, chosen.content);
      
      loadDirectoryContents();
      Alert.alert("Template Downloaded", `Created offline developer template file "${chosen.name}" inside templates/ folder.`);
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not generate template file.");
    }
  };

  const filteredFiles = filesList.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getFolderBreadcrumb = () => {
    if (currentPath === DIRECTORIES.root) return 'root';
    const relative = currentPath.replace(DIRECTORIES.root, '');
    return 'root / ' + relative.replace(/\/$/, '').replace(/\//g, ' / ');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />
      
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {currentPath !== DIRECTORIES.root && (
              <TouchableOpacity style={styles.backBtn} onPress={handleGoBack}>
                <Feather name="arrow-left" size={20} color={theme.textPrimary} />
              </TouchableOpacity>
            )}
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>File Manager</Text>
          </View>
          <TouchableOpacity
            style={[styles.downloadBtn, { backgroundColor: theme.primary }]}
            onPress={handleDownloadTemplate}
            activeOpacity={0.8}
          >
            <Feather name="download" size={14} color="#FFFFFF" />
            <Text style={styles.downloadText}>Template</Text>
          </TouchableOpacity>
        </View>

        {/* Path Breadcrumbs */}
        <View style={[styles.breadcrumbRow, { backgroundColor: isDarkMode ? '#131B2D' : '#F1F5F9' }]}>
          <Feather name="folder" size={12} color={theme.textMuted} style={{ marginRight: 6 }} />
          <Text style={[styles.breadcrumbText, { color: theme.textSecondary }]} numberOfLines={1}>
            {getFolderBreadcrumb()}
          </Text>
        </View>

        {/* Search */}
        <View style={[styles.searchRow, { backgroundColor: theme.searchBg }]}>
          <Feather name="search" size={16} color={theme.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.textPrimary }]}
            placeholder="Search files..."
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Files List */}
        <FlatList
          data={filteredFiles}
          keyExtractor={(item) => item.uri}
          renderItem={({ item }) => (
            <FileListItem
              item={item}
              onPress={() => handleItemPress(item)}
              onDelete={() => handleDelete(item)}
              onCopy={() => handleCopy(item)}
              onMove={() => handleMove(item)}
              onShare={() => shareFile(item.uri)}
            />
          )}
          contentContainerStyle={styles.listContent}
          onRefresh={loadDirectoryContents}
          refreshing={loading}
          ListEmptyComponent={
            loading ? null : (
              <EmptyState
                icon="folder"
                title="Folder is Empty"
                message={searchQuery ? "No files matched your search." : "No subfolders or documents are present in this folder."}
              />
            )
          }
        />
      </View>

      {/* Image Preview Overlay Modal */}
      <Modal visible={previewImageUri !== null} transparent animationType="fade">
        <View style={styles.modalBg}>
          <TouchableOpacity style={styles.modalCloseButton} onPress={() => setPreviewImageUri(null)}>
            <Feather name="x" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          {previewImageUri && (
            <Image source={{ uri: previewImageUri }} style={styles.modalImage} resizeMode="contain" />
          )}
        </View>
      </Modal>

      {/* Text Preview Overlay Modal */}
      <Modal visible={previewTextContent !== null} transparent animationType="slide">
        <SafeAreaView style={[styles.textModalBg, { backgroundColor: theme.background }]}>
          <View style={[styles.textModalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.textModalTitle, { color: theme.textPrimary }]} numberOfLines={1}>
              {previewTextName}
            </Text>
            <TouchableOpacity onPress={() => setPreviewTextContent(null)} style={styles.textModalCloseBtn}>
              <Feather name="x" size={20} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.textModalScroll}>
            <Text style={[styles.textPreviewContent, { color: theme.textPrimary }]}>
              {previewTextContent}
            </Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  backBtn: {
    padding: 6,
    marginRight: 6,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  downloadText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 6,
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginBottom: 10,
  },
  breadcrumbText: {
    fontSize: 11,
    fontFamily: 'monospace',
    flex: 1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: 6,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  listContent: {
    paddingBottom: 40,
    flexGrow: 1,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    padding: 10,
    zIndex: 100,
  },
  modalImage: {
    width: '90%',
    height: SCREEN_HEIGHT * 0.75,
  },
  textModalBg: {
    flex: 1,
  },
  textModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  textModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 10,
  },
  textModalCloseBtn: {
    padding: 4,
  },
  textModalScroll: {
    padding: 16,
  },
  textPreviewContent: {
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
});
