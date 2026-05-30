import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

interface CodeBlockProps {
  code: string;
  language: string;
  maxLines?: number;
}

const FONT_SIZE_KEY = '@devsnippets_editor_font_size';

// Regex tokenizer for JS, TS, Python, CSS, SQL, HTML, React
const tokenize = (code: string) => {
  const tokens: { text: string; type: string }[] = [];
  const regex = /(?<comment>\/\/.*|\/\*[\s\S]*?\*\/|#.*)|(?<string>"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(?<keyword>\b(?:function|const|let|var|return|if|else|for|while|do|switch|case|break|continue|import|export|from|default|class|extends|new|this|typeof|instanceof|try|catch|finally|throw|async|await|with|as|def|print|in|elif|except|pass|lambda|or|and|not)\b)|(?<number>\b\d+\b)|(?<builtin>\b(?:console|log|clearTimeout|setTimeout|setInterval|clearInterval|document|window|Math|JSON|Object|Array|Promise|Error|self|super)\b)|(?<other>[\s\S]+?)/g;

  let match;
  while ((match = regex.exec(code)) !== null) {
    const groups = match.groups;
    if (groups) {
      if (groups.comment) tokens.push({ text: groups.comment, type: 'comment' });
      else if (groups.string) tokens.push({ text: groups.string, type: 'string' });
      else if (groups.keyword) tokens.push({ text: groups.keyword, type: 'keyword' });
      else if (groups.number) tokens.push({ text: groups.number, type: 'number' });
      else if (groups.builtin) tokens.push({ text: groups.builtin, type: 'builtin' });
      else if (groups.other) tokens.push({ text: groups.other, type: 'other' });
    }
  }
  return tokens;
};

const tokenizeLines = (code: string) => {
  const tokens = tokenize(code);
  const lines: { text: string; type: string }[][] = [[]];
  
  for (const token of tokens) {
    if (token.text.includes('\n')) {
      const parts = token.text.split('\n');
      for (let i = 0; i < parts.length; i++) {
        if (parts[i]) {
          lines[lines.length - 1].push({ text: parts[i], type: token.type });
        }
        if (i < parts.length - 1) {
          lines.push([]);
        }
      }
    } else {
      lines[lines.length - 1].push(token);
    }
  }
  return lines;
};

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language, maxLines }) => {
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState(13);

  useEffect(() => {
    const loadFontSize = async () => {
      try {
        const stored = await AsyncStorage.getItem(FONT_SIZE_KEY);
        if (stored) {
          setFontSize(parseInt(stored, 10));
        }
      } catch (e) {
        // Fallback to default
      }
    };
    loadFontSize();
  }, []);

  const lines = tokenizeLines(code);
  const displayedLines = maxLines ? lines.slice(0, maxLines) : lines;

  const handleCopy = async () => {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getTokenColor = (type: string) => {
    switch (type) {
      case 'comment':
        return '#6272A4'; // Dracula style muted gray-blue comment
      case 'string':
        return '#50FA7B'; // Dracula green string
      case 'keyword':
        return '#FF79C6'; // Dracula pink keyword
      case 'number':
        return '#BD93F9'; // Dracula purple number
      case 'builtin':
        return '#8BE9FD'; // Dracula cyan built-in
      default:
        return '#F8FAFC'; // White/light text
    }
  };

  const lineHeight = fontSize + 7;

  return (
    <View style={styles.container}>
      {/* Copy button overlay */}
      <TouchableOpacity 
        style={[styles.copyButton, { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]} 
        onPress={handleCopy}
        activeOpacity={0.7}
      >
        <Feather 
          name={copied ? "check" : "copy"} 
          size={14} 
          color={copied ? '#50FA7B' : '#94A3B8'} 
        />
      </TouchableOpacity>

      <ScrollView horizontal contentContainerStyle={{ flexGrow: 1 }}>
        <View style={styles.codeContainer}>
          {/* Line Numbers Column */}
          <View style={styles.lineNumbersColumn}>
            {displayedLines.map((_, idx) => (
              <Text 
                key={idx} 
                style={[styles.lineNumberText, { fontSize, lineHeight }]}
              >
                {idx + 1}
              </Text>
            ))}
          </View>

          {/* Code Text Column */}
          <View style={styles.codeContentColumn}>
            {displayedLines.map((lineTokens, lineIdx) => (
              <Text key={lineIdx} style={[styles.codeLine, { lineHeight }]} numberOfLines={1}>
                {lineTokens.length === 0 ? (
                  <Text style={{ fontFamily: 'monospace', fontSize }}> </Text>
                ) : (
                  lineTokens.map((token, tokenIdx) => (
                    <Text
                      key={tokenIdx}
                      style={{
                        color: getTokenColor(token.type),
                        fontFamily: 'monospace',
                        fontSize,
                      }}
                    >
                      {token.text}
                    </Text>
                  ))
                )}
              </Text>
            ))}
            {maxLines && lines.length > maxLines && (
              <Text style={[styles.codeLine, { color: '#6272A4', fontStyle: 'italic', fontSize, lineHeight }]}>
                ... {lines.length - maxLines} more lines
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0B0F19', // Deep dark background from screenshot
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingVertical: 12,
    position: 'relative',
    marginVertical: 8,
    minHeight: 60,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  lineNumbersColumn: {
    width: 32,
    alignItems: 'flex-end',
    paddingRight: 10,
    borderRightWidth: 1,
    borderRightColor: '#1E293B',
  },
  lineNumberText: {
    fontFamily: 'monospace',
    color: '#475569',
  },
  codeContentColumn: {
    paddingLeft: 12,
    paddingRight: 24,
  },
  codeLine: {
    flexDirection: 'row',
  },
  copyButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
});

