import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

// Context & DB
import { ThemeProvider } from './src/context/ThemeContext';
import { useTheme } from './src/hooks/useTheme';
import { initDatabase } from './src/database/db';
import { ensureDirectoriesExist } from './src/utils/fileUtils';

// Screens
import { HomeScreen } from './src/screens/HomeScreen';
import { FavoritesScreen } from './src/screens/FavoritesScreen';
import { FileManagerScreen } from './src/screens/FileManagerScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { SnippetDetailScreen } from './src/screens/SnippetDetailScreen';
import { CreateSnippetScreen } from './src/screens/CreateSnippetScreen';
import { EditSnippetScreen } from './src/screens/EditSnippetScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Nested Stacks
function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeList" component={HomeScreen} />
      <Stack.Screen name="SnippetDetail" component={SnippetDetailScreen} />
      <Stack.Screen name="CreateSnippet" component={CreateSnippetScreen} />
      <Stack.Screen name="EditSnippet" component={EditSnippetScreen} />
    </Stack.Navigator>
  );
}

function FavStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FavList" component={FavoritesScreen} />
      <Stack.Screen name="SnippetDetail" component={SnippetDetailScreen} />
      <Stack.Screen name="CreateSnippet" component={CreateSnippetScreen} />
      <Stack.Screen name="EditSnippet" component={EditSnippetScreen} />
    </Stack.Navigator>
  );
}

function NavigationWrapper() {
  const { theme, isDarkMode } = useTheme();

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: theme.activeTab,
          tabBarInactiveTintColor: theme.inactiveTab,
          tabBarStyle: {
            backgroundColor: isDarkMode ? '#090D16' : '#FFFFFF',
            borderTopColor: theme.border,
            borderTopWidth: 1,
            height: 60,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            marginTop: 2,
          },
          tabBarIcon: ({ color, size }) => {
            let iconName: keyof typeof Feather.glyphMap = 'code';

            if (route.name === 'Snippets') {
              iconName = 'code';
            } else if (route.name === 'Favorites') {
              iconName = 'star';
            } else if (route.name === 'Files') {
              iconName = 'folder';
            } else if (route.name === 'Settings') {
              iconName = 'settings';
            }

            return <Feather name={iconName} size={20} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Snippets" component={HomeStack} />
        <Tab.Screen name="Favorites" component={FavStack} />
        <Tab.Screen name="Files" component={FileManagerScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize SQLite tables
        await initDatabase();
        
        // Ensure local document directory folders are created
        await ensureDirectoriesExist();
        
        setDbReady(true);
      } catch (err) {
        console.error('App setup failed', err);
        setDbError(true);
      }
    };

    initializeApp();
  }, []);

  if (dbError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>SQLite database failed to initialize.</Text>
        <Text style={styles.errorSub}>Please restart the application to retry.</Text>
      </View>
    );
  }

  if (!dbReady) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Initializing storage...</Text>
      </View>
    );
  }

  return (
    <ThemeProvider>
      <NavigationWrapper />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#090D16',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#090D16',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSub: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
  },
});
