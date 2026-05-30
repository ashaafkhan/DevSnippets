import React, { useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
  Alert
} from 'react-native';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { Snippet, toggleFavorite } from '../database/db';
import { useTheme } from '../hooks/useTheme';
import { getLanguageConfig } from '../constants/languages';
import { CodeBlock } from './CodeBlock';

interface SnippetCardProps {
  snippet: Snippet;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onExport: () => void;
  onToggleFavorite: () => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 60;
const BUTTON_WIDTH = 80;

export const formatDate = (dateStr: string): string => {
  try {
    // Convert SQLite datetime('now') UTC or local string to Date
    // SQLite uses format: YYYY-MM-DD HH:MM:SS
    const tFormatted = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
    const date = new Date(tFormatted);
    if (isNaN(date.getTime())) {
      return dateStr;
    }
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  } catch (e) {
    return dateStr;
  }
};

export const SnippetCard: React.FC<SnippetCardProps> = ({
  snippet,
  onPress,
  onEdit,
  onDelete,
  onExport,
  onToggleFavorite
}) => {
  const { theme, isDarkMode } = useTheme();
  const pan = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only trigger pan responder if horizontal swipe is greater than vertical gesture
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 10;
      },
      onPanResponderMove: (_, gestureState) => {
        // Clamp swipe behavior between [-BUTTON_WIDTH, BUTTON_WIDTH]
        let newX = gestureState.dx;
        if (newX > BUTTON_WIDTH) newX = BUTTON_WIDTH;
        if (newX < -BUTTON_WIDTH) newX = -BUTTON_WIDTH;
        pan.setValue(newX);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD) {
          // Open Edit action
          Animated.spring(pan, {
            toValue: BUTTON_WIDTH,
            useNativeDriver: true,
          }).start();
        } else if (gestureState.dx < -SWIPE_THRESHOLD) {
          // Open Delete action
          Animated.spring(pan, {
            toValue: -BUTTON_WIDTH,
            useNativeDriver: true,
          }).start();
        } else {
          // Snap back to closed
          Animated.spring(pan, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const closeSwipe = () => {
    Animated.spring(pan, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  };

  const handleEditPress = () => {
    closeSwipe();
    onEdit();
  };

  const handleDeletePress = () => {
    closeSwipe();
    onDelete();
  };

  const handleMorePress = () => {
    Alert.alert(
      snippet.title,
      "Choose snippet action:",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Edit Snippet", onPress: onEdit },
        { text: "Export Snippet", onPress: onExport },
        { text: "Delete Snippet", style: "destructive", onPress: onDelete }
      ]
    );
  };

  const langConfig = getLanguageConfig(snippet.language);
  const tagsList = snippet.tags
    ? snippet.tags.split(',').map(t => t.trim()).filter(Boolean)
    : [];

  return (
    <View style={styles.outerContainer}>
      {/* Background Swipe Buttons */}
      <View style={styles.backgroundContainer}>
        {/* Left Swipe -> Edit button */}
        <TouchableOpacity
          style={[styles.swipeButtonLeft, { backgroundColor: '#7F77DD' }]}
          onPress={handleEditPress}
        >
          <Feather name="edit-2" size={20} color="#FFFFFF" />
          <Text style={styles.swipeText}>Edit</Text>
        </TouchableOpacity>

        {/* Right Swipe -> Delete button */}
        <TouchableOpacity
          style={[styles.swipeButtonRight, { backgroundColor: theme.danger }]}
          onPress={handleDeletePress}
        >
          <Feather name="trash-2" size={20} color="#FFFFFF" />
          <Text style={styles.swipeText}>Delete</Text>
        </TouchableOpacity>
      </View>

      {/* Main Card View */}
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            transform: [{ translateX: pan }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity activeOpacity={0.95} onPress={onPress}>
          <View style={styles.cardHeader}>
            <View style={styles.titleContainer}>
              <Text style={[styles.title, { color: theme.textPrimary }]} numberOfLines={1}>
                {snippet.title}
              </Text>
            </View>

            {/* Header Actions */}
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={onToggleFavorite} style={styles.actionIcon}>
                <FontAwesome
                  name={snippet.is_favorite ? "star" : "star-o"}
                  size={20}
                  color={snippet.is_favorite ? theme.star : theme.textSecondary}
                />
              </TouchableOpacity>

              <TouchableOpacity onPress={handleMorePress} style={styles.actionIcon}>
                <Feather name="more-vertical" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Metadata: Language Box + Tags row */}
          <View style={styles.metaRow}>
            <View style={[styles.langBadge, { backgroundColor: langConfig.bg }]}>
              <Text style={[styles.langText, { color: langConfig.text }]}>
                {langConfig.short}
              </Text>
            </View>

            <View style={styles.tagsContainer}>
              {tagsList.map((tag, idx) => (
                <View key={idx} style={[styles.tagBadge, { backgroundColor: isDarkMode ? '#1B2333' : '#E2E8F0' }]}>
                  <Text style={[styles.tagText, { color: theme.textSecondary }]}>
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Code Viewer (Dark theme always) */}
          <CodeBlock code={snippet.code} language={snippet.language} maxLines={6} />

          {/* Footer: Date & Tags count */}
          <View style={styles.cardFooter}>
            <View style={styles.footerItem}>
              <Feather name="calendar" size={14} color={theme.textMuted} style={styles.footerIcon} />
              <Text style={[styles.footerText, { color: theme.textMuted }]}>
                {formatDate(snippet.created_at)}
              </Text>
            </View>

            <View style={styles.footerItem}>
              <Feather name="tag" size={14} color={theme.textMuted} style={styles.footerIcon} />
              <Text style={[styles.footerText, { color: theme.textMuted }]}>
                {tagsList.length} {tagsList.length === 1 ? 'tag' : 'tags'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    position: 'relative',
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 12,
  },
  swipeButtonLeft: {
    width: BUTTON_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  swipeButtonRight: {
    width: BUTTON_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  swipeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleContainer: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    padding: 6,
    marginLeft: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  langBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 26,
  },
  langText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 6,
    marginVertical: 2,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.03)',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerIcon: {
    marginRight: 5,
  },
  footerText: {
    fontSize: 12,
  },
});
