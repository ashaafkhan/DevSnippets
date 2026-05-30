import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { formatBytes } from '../utils/fileUtils';

export interface FileItem {
  name: string;
  uri: string;
  isDirectory: boolean;
  size: number;
  modificationTime?: number;
  fileCount?: number; // Only for folders
}

interface FileListItemProps {
  item: FileItem;
  onPress: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onMove: () => void;
  onShare: () => void;
}

export const FileListItem: React.FC<FileListItemProps> = ({
  item,
  onPress,
  onDelete,
  onCopy,
  onMove,
  onShare,
}) => {
  const { theme } = useTheme();

  // Helper to determine icon name and color
  const getFileIconConfig = () => {
    if (item.isDirectory) {
      return { name: 'folder' as const, color: '#F59E0B' }; // Amber folder
    }

    const ext = item.name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js':
      case 'ts':
      case 'tsx':
      case 'html':
      case 'css':
      case 'json':
      case 'py':
      case 'cpp':
      case 'rs':
        return { name: 'code' as const, color: '#0D9488' }; // Teal for code files
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'webp':
      case 'gif':
        return { name: 'image' as const, color: '#7F77DD' }; // Purple for images
      default:
        return { name: 'file-text' as const, color: '#64748B' }; // Gray for txt/other
    }
  };

  const iconConfig = getFileIconConfig();

  const handleMorePress = () => {
    if (item.isDirectory) {
      Alert.alert(
        item.name,
        "Directory actions:",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete Directory", style: "destructive", onPress: onDelete }
        ]
      );
    } else {
      Alert.alert(
        item.name,
        "File actions:",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Share File", onPress: onShare },
          { text: "Copy File", onPress: onCopy },
          { text: "Move File", onPress: onMove },
          { text: "Delete File", style: "destructive", onPress: onDelete }
        ]
      );
    }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '';
    // timestamp is in seconds from FileSystem
    const date = new Date(timestamp * 1000);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={onPress}
      onLongPress={handleMorePress}
      activeOpacity={0.7}
    >
      <View style={styles.leftSection}>
        <View style={[styles.iconContainer, { backgroundColor: `${iconConfig.color}15` }]}>
          <Feather name={iconConfig.name} size={20} color={iconConfig.color} />
        </View>
        <View style={styles.infoContainer}>
          <Text style={[styles.name, { color: theme.textPrimary }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            {item.isDirectory
              ? `${item.fileCount || 0} ${item.fileCount === 1 ? 'file' : 'files'} · ${formatBytes(item.size)}`
              : `${formatBytes(item.size)} · ${formatDate(item.modificationTime)}`}
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.moreButton} onPress={handleMorePress}>
        <Feather name="more-vertical" size={18} color={theme.textSecondary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 4,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 11,
  },
  moreButton: {
    padding: 8,
  },
});
