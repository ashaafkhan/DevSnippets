import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Modal,
  Alert,
  Dimensions
} from 'react-native';
import { useRoute, useNavigation, useIsFocused, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { getSnippetById, toggleFavorite, deleteSnippet, Snippet, AttachedFile } from '../database/db';
import { getLanguageConfig } from '../constants/languages';
import { CodeBlock } from '../components/CodeBlock';
import { formatDate } from '../components/SnippetCard';
import { exportSingleSnippet, shareFile } from '../utils/exportUtils';

type DetailRouteProp = RouteProp<{
  SnippetDetail: { snippetId: number };
}, 'SnippetDetail'>;

type DetailNavigationProp = StackNavigationProp<{
  HomeList: undefined;
  SnippetDetail: { snippetId: number };
  CreateSnippet: undefined;
  EditSnippet: { snippetId: number };
}>;

const SCREEN_HEIGHT = Dimensions.get('window').height;

export const SnippetDetailScreen: React.FC = () => {
  const { theme, isDarkMode } = useTheme();
  const route = useRoute<DetailRouteProp>();
  const navigation = useNavigation<DetailNavigationProp>();
  const isFocused = useIsFocused();
  const { snippetId } = route.params;

  const [snippet, setSnippet] = useState<Snippet | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);

  const fetchSnippetDetails = async () => {
    try {
      const data = await getSnippetById(snippetId);
      setSnippet(data.snippet);
      setAttachedFiles(data.files);
    } catch (e) {
      console.error('Failed to load snippet detail', e);
      Alert.alert('Error', 'Failed to retrieve snippet details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      fetchSnippetDetails();
    }
  }, [isFocused, snippetId]);

  const handleToggleFavorite = async () => {
    if (!snippet) return;
    const nextStatus = snippet.is_favorite !== 1;
    try {
      await toggleFavorite(snippet.id, nextStatus);
      setSnippet({ ...snippet, is_favorite: nextStatus ? 1 : 0 });
    } catch (e) {
      console.error('Failed to toggle favorite', e);
    }
  };

  const handleDelete = () => {
    if (!snippet) return;
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this snippet permanently?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteSnippet(snippet.id);
              navigation.goBack();
            } catch (e) {
              console.error('Delete failed', e);
              Alert.alert('Error', 'Failed to delete snippet.');
            }
          }
        }
      ]
    );
  };

  const handleExport = () => {
    if (!snippet) return;
    Alert.alert(
      "Export Snippet",
      "Select an export format:",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Plain Text (.txt)", onPress: () => triggerExport('txt') },
        { text: "JavaScript (.js)", onPress: () => triggerExport('js') },
        { text: "JSON (.json)", onPress: () => triggerExport('json') }
      ]
    );
  };

  const triggerExport = async (format: 'txt' | 'js' | 'json') => {
    if (!snippet) return;
    const path = await exportSingleSnippet(snippet, format);
    if (path) {
      await shareFile(path);
    } else {
      Alert.alert("Error", "Could not export snippet file.");
    }
  };

  const handleAttachmentPress = (file: AttachedFile) => {
    const ext = file.file_name?.split('.').pop()?.toLowerCase();
    const isImg = ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext || '');
    if (isImg) {
      setPreviewImageUri(file.file_uri);
    } else {
      // Non-image file, trigger share
      shareFile(file.file_uri);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={{ color: theme.textSecondary }}>Loading details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!snippet) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={{ color: theme.textSecondary, marginBottom: 12 }}>Snippet not found.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{ color: theme.primary, fontWeight: 'bold' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const langConfig = getLanguageConfig(snippet.language);
  const tagsList = snippet.tags
    ? snippet.tags.split(',').map(t => t.trim()).filter(Boolean)
    : [];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      {/* Header bar */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={20} color={theme.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerButton} onPress={handleToggleFavorite}>
            <FontAwesome
              name={snippet.is_favorite ? "star" : "star-o"}
              size={20}
              color={snippet.is_favorite ? theme.star : theme.textPrimary}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.headerButton} onPress={handleExport}>
            <Feather name="share" size={20} color={theme.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('EditSnippet', { snippetId: snippet.id })}>
            <Feather name="edit-3" size={20} color={theme.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.headerButton} onPress={handleDelete}>
            <Feather name="trash-2" size={20} color={theme.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Title */}
        <Text style={[styles.title, { color: theme.textPrimary }]}>{snippet.title}</Text>

        {/* Metadata section */}
        <View style={styles.metaRow}>
          <View style={[styles.langBadge, { backgroundColor: langConfig.bg }]}>
            <Text style={[styles.langText, { color: langConfig.text }]}>{langConfig.short}</Text>
          </View>
          <Text style={[styles.metaText, { color: theme.textMuted }]}>
            {snippet.language} · Created {formatDate(snippet.created_at)}
          </Text>
        </View>

        {/* Tags */}
        {tagsList.length > 0 && (
          <View style={styles.tagsContainer}>
            {tagsList.map((tag, idx) => (
              <View key={idx} style={[styles.tagBadge, { backgroundColor: isDarkMode ? '#131B2D' : '#E2E8F0' }]}>
                <Text style={[styles.tagText, { color: theme.textSecondary }]}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Code container */}
        <View style={styles.codeWrapper}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Source Code</Text>
          <CodeBlock code={snippet.code} language={snippet.language} />
        </View>

        {/* Attachments Section */}
        <View style={styles.attachmentsWrapper}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            Attached Files ({attachedFiles.length})
          </Text>
          
          {attachedFiles.length === 0 ? (
            <Text style={[styles.emptyAttachments, { color: theme.textMuted }]}>
              No files or screenshots attached. Edit snippet to attach items.
            </Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbsScroll}>
              {attachedFiles.map((file) => {
                const ext = file.file_name?.split('.').pop()?.toLowerCase();
                const isImg = ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext || '');

                return (
                  <TouchableOpacity
                    key={file.id}
                    style={[styles.thumbContainer, { borderColor: theme.border, backgroundColor: theme.card }]}
                    onPress={() => handleAttachmentPress(file)}
                    activeOpacity={0.8}
                  >
                    {isImg ? (
                      <Image source={{ uri: file.file_uri }} style={styles.thumbnail} resizeMode="cover" />
                    ) : (
                      <View style={styles.fileIconContainer}>
                        <Feather name="file-text" size={24} color={theme.primary} />
                      </View>
                    )}
                    <Text style={[styles.thumbLabel, { color: theme.textPrimary }]} numberOfLines={1}>
                      {file.file_name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      </ScrollView>

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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 12,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  langBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  metaText: {
    fontSize: 13,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  tagBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
    marginVertical: 4,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  codeWrapper: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  attachmentsWrapper: {
    marginTop: 8,
  },
  emptyAttachments: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 4,
  },
  thumbsScroll: {
    paddingVertical: 8,
  },
  thumbContainer: {
    width: 90,
    height: 110,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 12,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: 70,
    borderRadius: 4,
  },
  fileIconContainer: {
    width: '100%',
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbLabel: {
    fontSize: 10,
    textAlign: 'center',
    width: '100%',
    marginTop: 4,
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
});
