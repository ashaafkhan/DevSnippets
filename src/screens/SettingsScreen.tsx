import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Switch,
  SafeAreaView,
  StatusBar,
  Alert,
  ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { DIRECTORIES, formatBytes, getDirectorySizeRecursive } from '../utils/fileUtils';
import { getAllSnippets } from '../database/db';
import { exportAllSnippets, shareFile } from '../utils/exportUtils';

const FONT_SIZE_KEY = '@devsnippets_editor_font_size';
const EXPORT_FORMAT_KEY = '@devsnippets_default_export_format';

export const SettingsScreen: React.FC = () => {
  const { theme, isDarkMode, toggleTheme } = useTheme();

  const [fontSize, setFontSize] = useState<number>(14);
  const [exportFormat, setExportFormat] = useState<string>('.json');
  const [storageUsage, setStorageUsage] = useState<number>(0);
  const [showFontDropdown, setShowFontDropdown] = useState(false);
  const [showFormatDropdown, setShowFormatDropdown] = useState(false);

  const calculateStorage = useCallback(async () => {
    try {
      const size = await getDirectorySizeRecursive(DIRECTORIES.root);
      setStorageUsage(size);
    } catch (e) {
      console.error('Failed to compute storage', e);
    }
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedSize = await AsyncStorage.getItem(FONT_SIZE_KEY);
        if (storedSize) setFontSize(parseInt(storedSize, 10));

        const storedFormat = await AsyncStorage.getItem(EXPORT_FORMAT_KEY);
        if (storedFormat) setExportFormat(storedFormat);
      } catch (e) {
        console.warn('Failed to load settings', e);
      }
    };

    loadSettings();
    calculateStorage();
  }, [calculateStorage]);

  const changeFontSize = async (size: number) => {
    try {
      setFontSize(size);
      await AsyncStorage.setItem(FONT_SIZE_KEY, size.toString());
      setShowFontDropdown(false);
      Alert.alert("Setting Saved", `Monospace font size set to ${size}px.`);
    } catch (e) {
      console.error(e);
    }
  };

  const changeExportFormat = async (format: string) => {
    try {
      setExportFormat(format);
      await AsyncStorage.setItem(EXPORT_FORMAT_KEY, format);
      setShowFormatDropdown(false);
      Alert.alert("Setting Saved", `Default export format set to ${format}.`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      "Clear Cache",
      "Are you sure you want to delete all files in your Exports folder? Snippets in your database will not be affected.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              // Delete exports folder and recreate it
              await FileSystem.deleteAsync(DIRECTORIES.exports, { idempotent: true });
              await FileSystem.makeDirectoryAsync(DIRECTORIES.exports, { intermediates: true });
              calculateStorage();
              Alert.alert("Cache Cleared", "Exported cache directory has been purged.");
            } catch (e) {
              Alert.alert("Error", "Failed to clear cache directory.");
            }
          }
        }
      ]
    );
  };

  const handleExportAll = async () => {
    try {
      const snippets = await getAllSnippets();
      if (snippets.length === 0) {
        Alert.alert("No Snippets", "There are no snippets to export.");
        return;
      }

      const filePath = await exportAllSnippets(snippets);
      if (filePath) {
        await shareFile(filePath);
        calculateStorage();
      } else {
        Alert.alert("Error", "Could not generate backup file.");
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Backup failed.");
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />
      
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Settings</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          {/* Appearance Section */}
          <Text style={[styles.sectionTitle, { color: theme.primary }]}>Appearance</Text>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingLabelGroup}>
                <Feather name="moon" size={16} color={theme.textPrimary} style={{ marginRight: 10 }} />
                <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>Dark Mode</Text>
              </View>
              <Switch
                value={isDarkMode}
                onValueChange={toggleTheme}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            {/* Font Size Dropdown */}
            <View style={styles.settingColumn}>
              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => setShowFontDropdown(!showFontDropdown)}
              >
                <View style={styles.settingLabelGroup}>
                  <Feather name="type" size={16} color={theme.textPrimary} style={{ marginRight: 10 }} />
                  <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>Editor Font Size</Text>
                </View>
                <View style={styles.settingValueRow}>
                  <Text style={{ color: theme.textSecondary, marginRight: 6 }}>{fontSize}px</Text>
                  <Feather name={showFontDropdown ? "chevron-up" : "chevron-down"} size={14} color={theme.textSecondary} />
                </View>
              </TouchableOpacity>

              {showFontDropdown && (
                <View style={[styles.dropdownOptions, { backgroundColor: isDarkMode ? '#1B2333' : '#F1F5F9' }]}>
                  {[12, 14, 16].map((size) => (
                    <TouchableOpacity
                      key={size}
                      style={styles.dropdownOption}
                      onPress={() => changeFontSize(size)}
                    >
                      <Text style={{ color: theme.textPrimary, fontWeight: fontSize === size ? '700' : '400' }}>
                        {size}px {fontSize === size ? '✓' : ''}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Export Section */}
          <Text style={[styles.sectionTitle, { color: theme.primary, marginTop: 24 }]}>Export Preferences</Text>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {/* Format Dropdown */}
            <View style={styles.settingColumn}>
              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => setShowFormatDropdown(!showFormatDropdown)}
              >
                <View style={styles.settingLabelGroup}>
                  <Feather name="file" size={16} color={theme.textPrimary} style={{ marginRight: 10 }} />
                  <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>Default Export Format</Text>
                </View>
                <View style={styles.settingValueRow}>
                  <Text style={{ color: theme.textSecondary, marginRight: 6 }}>{exportFormat}</Text>
                  <Feather name={showFormatDropdown ? "chevron-up" : "chevron-down"} size={14} color={theme.textSecondary} />
                </View>
              </TouchableOpacity>

              {showFormatDropdown && (
                <View style={[styles.dropdownOptions, { backgroundColor: isDarkMode ? '#1B2333' : '#F1F5F9' }]}>
                  {['.txt', '.js', '.json'].map((fmt) => (
                    <TouchableOpacity
                      key={fmt}
                      style={styles.dropdownOption}
                      onPress={() => changeExportFormat(fmt)}
                    >
                      <Text style={{ color: theme.textPrimary, fontWeight: exportFormat === fmt ? '700' : '400' }}>
                        {fmt} {exportFormat === fmt ? '✓' : ''}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <TouchableOpacity style={styles.settingRow} onPress={handleExportAll}>
              <View style={styles.settingLabelGroup}>
                <Feather name="download-cloud" size={16} color={theme.textPrimary} style={{ marginRight: 10 }} />
                <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>Export All Snippets (Backup)</Text>
              </View>
              <Feather name="chevron-right" size={14} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Storage Section */}
          <Text style={[styles.sectionTitle, { color: theme.primary, marginTop: 24 }]}>Storage Management</Text>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingLabelGroup}>
                <Feather name="hard-drive" size={16} color={theme.textPrimary} style={{ marginRight: 10 }} />
                <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>Total Storage Used</Text>
              </View>
              <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>{formatBytes(storageUsage)}</Text>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <TouchableOpacity style={styles.settingRow} onPress={handleClearCache}>
              <View style={styles.settingLabelGroup}>
                <Feather name="trash-2" size={16} color={theme.danger} style={{ marginRight: 10 }} />
                <Text style={[styles.settingLabel, { color: theme.danger }]}>Clear Exported Cache</Text>
              </View>
              <Feather name="chevron-right" size={14} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

        </ScrollView>
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
  scrollContent: {
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingColumn: {
    flexDirection: 'column',
  },
  settingLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  settingValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    height: 1,
  },
  dropdownOptions: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  dropdownOption: {
    paddingVertical: 8,
    paddingLeft: 26,
  },
});
