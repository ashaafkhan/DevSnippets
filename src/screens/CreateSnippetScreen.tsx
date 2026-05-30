import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Switch,
  Alert,
  Image
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../hooks/useTheme';
import { insertSnippet, insertAttachedFile } from '../database/db';
import { languageList } from '../constants/languages';
import { DIRECTORIES, copyFileLocal } from '../utils/fileUtils';

type CreateScreenNavigationProp = StackNavigationProp<{
  HomeList: undefined;
}>;

interface SelectedFile {
  uri: string;
  name: string;
  type: string;
}

export const CreateSnippetScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<CreateScreenNavigationProp>();

  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('JavaScript');
  const [tags, setTags] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [attachments, setAttachments] = useState<SelectedFile[]>([]);
  const [showLangPicker, setShowLangPicker] = useState(false);

  const handleAttachImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission Denied", "Media library permissions are required to select screenshots.");
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileName = asset.fileName || `screenshot_${Date.now()}.png`;
        setAttachments(prev => [...prev, {
          uri: asset.uri,
          name: fileName,
          type: 'image/png'
        }]);
      }
    } catch (e) {
      console.error('Image picker error', e);
      Alert.alert("Error", "Could not access image library.");
    }
  };

  const handleAttachFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setAttachments(prev => [...prev, {
          uri: file.uri,
          name: file.name,
          type: file.mimeType || 'application/octet-stream'
        }]);
      }
    } catch (e) {
      console.error('Document picker error', e);
      Alert.alert("Error", "Could not open document picker.");
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Validation Failed", "Title is required.");
      return;
    }
    if (!code.trim()) {
      Alert.alert("Validation Failed", "Code block is required.");
      return;
    }

    try {
      // 1. Insert snippet record
      const snippetId = await insertSnippet(
        title.trim(),
        code,
        language,
        tags.trim(),
        isFavorite
      );

      // 2. Process file attachments
      for (const file of attachments) {
        // Copy temporary file to app's snippet directory
        const localUri = await copyFileLocal(
          file.uri,
          DIRECTORIES.snippets,
          file.name
        );
        
        // Save file entry linked to SQLite snippet record
        await insertAttachedFile(snippetId, localUri, file.name, file.type);
      }

      Alert.alert("Success", "Snippet saved successfully!", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      console.error('Failed to save snippet', e);
      Alert.alert("Error", "Failed to save snippet to SQLite.");
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={20} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Create Snippet</Text>
        <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.primary }]} onPress={handleSave}>
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Title input */}
        <Text style={[styles.label, { color: theme.textPrimary }]}>Title</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.textPrimary }]}
          placeholder="e.g. Debounce Function"
          placeholderTextColor={theme.textMuted}
          value={title}
          onChangeText={setTitle}
        />

        {/* Language selector */}
        <Text style={[styles.label, { color: theme.textPrimary }]}>Language</Text>
        <TouchableOpacity
          style={[styles.pickerTrigger, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={() => setShowLangPicker(!showLangPicker)}
        >
          <Text style={{ color: theme.textPrimary }}>{language}</Text>
          <Feather name={showLangPicker ? "chevron-up" : "chevron-down"} size={16} color={theme.textSecondary} />
        </TouchableOpacity>

        {showLangPicker && (
          <View style={[styles.pickerContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {languageList.map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[styles.pickerItem, { borderBottomColor: theme.border }]}
                onPress={() => {
                  setLanguage(lang);
                  setShowLangPicker(false);
                }}
              >
                <Text style={{ color: theme.textPrimary, fontWeight: language === lang ? '700' : '400' }}>
                  {lang}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Tags input */}
        <Text style={[styles.label, { color: theme.textPrimary }]}>Tags (comma-separated)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.textPrimary }]}
          placeholder="utility, performance, hook"
          placeholderTextColor={theme.textMuted}
          value={tags}
          onChangeText={setTags}
          autoCapitalize="none"
        />

        {/* Favorite toggle */}
        <View style={styles.switchRow}>
          <Text style={[styles.label, { color: theme.textPrimary, marginBottom: 0 }]}>Mark as Favorite</Text>
          <Switch
            value={isFavorite}
            onValueChange={setIsFavorite}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Code Input (Monospace dark theme) */}
        <Text style={[styles.label, { color: theme.textPrimary }]}>Code Block</Text>
        <TextInput
          style={styles.codeEditor}
          multiline
          placeholder="// Paste or write your code here..."
          placeholderTextColor="#6272A4"
          value={code}
          onChangeText={setCode}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {/* Attachments Section */}
        <View style={styles.attachmentsSection}>
          <Text style={[styles.label, { color: theme.textPrimary }]}>Attachments</Text>
          <View style={styles.attachButtonsRow}>
            <TouchableOpacity
              style={[styles.attachButton, { borderColor: theme.primary }]}
              onPress={handleAttachImage}
            >
              <Feather name="image" size={14} color={theme.primary} />
              <Text style={[styles.attachButtonText, { color: theme.primary }]}>Screenshot</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.attachButton, { borderColor: theme.primary }]}
              onPress={handleAttachFile}
            >
              <Feather name="file" size={14} color={theme.primary} />
              <Text style={[styles.attachButtonText, { color: theme.primary }]}>File / Template</Text>
            </TouchableOpacity>
          </View>

          {attachments.length > 0 && (
            <View style={styles.thumbsGrid}>
              {attachments.map((file, index) => (
                <View key={index} style={[styles.thumbCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
                  {file.type.startsWith('image/') ? (
                    <Image source={{ uri: file.uri }} style={styles.thumbImg} />
                  ) : (
                    <View style={styles.thumbFileIcon}>
                      <Feather name="file-text" size={24} color={theme.textSecondary} />
                    </View>
                  )}
                  <Text style={[styles.thumbName, { color: theme.textPrimary }]} numberOfLines={1}>
                    {file.name}
                  </Text>
                  <TouchableOpacity
                    style={styles.deleteThumb}
                    onPress={() => removeAttachment(index)}
                  >
                    <Feather name="x" size={12} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  saveText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    marginBottom: 16,
    fontSize: 14,
  },
  pickerTrigger: {
    height: 44,
    borderWidth: 1,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 6,
    marginBottom: 16,
    maxHeight: 180,
    overflow: 'hidden',
  },
  pickerItem: {
    padding: 12,
    borderBottomWidth: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  codeEditor: {
    height: 200,
    backgroundColor: '#0B0F19',
    borderColor: '#1E293B',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontFamily: 'monospace',
    fontSize: 13,
    color: '#F8FAFC',
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  attachmentsSection: {
    marginTop: 8,
  },
  attachButtonsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  attachButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 12,
  },
  attachButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  thumbsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  thumbCard: {
    width: 80,
    height: 100,
    borderWidth: 1,
    borderRadius: 6,
    padding: 4,
    marginRight: 10,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
  },
  thumbImg: {
    width: '100%',
    height: 65,
    borderRadius: 4,
  },
  thumbFileIcon: {
    width: '100%',
    height: 65,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbName: {
    fontSize: 9,
    width: '100%',
    textAlign: 'center',
  },
  deleteThumb: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
