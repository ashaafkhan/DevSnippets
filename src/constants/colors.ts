export const colors = {
  light: {
    background: '#F8FAFC',
    card: '#FFFFFF',
    searchBg: '#F1F5F9',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#64748B',
    primary: '#6366F1', // Lavender Indigo
    primaryLight: '#EEEDFE',
    border: '#E2E8F0',
    star: '#F59E0B', // Amber
    danger: '#EF4444',
    cardFooterBg: '#F8FAFC',
    inactiveTab: '#94A3B8',
    activeTab: '#6366F1',
    activeChipText: '#FFFFFF',
    inactiveChipText: '#475569',
    inactiveChipBg: '#E2E8F0',
  },
  dark: {
    background: '#090D16', // Deep Dark Navy/Black from screenshot
    card: '#121824', // Dark Charcoal card background
    searchBg: '#1B2333', // Darker input background
    textPrimary: '#F8FAFC', // Slate 50
    textSecondary: '#94A3B8', // Slate 400
    textMuted: '#64748B', // Slate 500
    primary: '#6366F1', // Lavender Indigo
    primaryLight: '#1E1B4B',
    border: '#1E293B',
    star: '#FBBF24', // Amber/Yellow star
    danger: '#EF4444',
    cardFooterBg: '#131A28',
    inactiveTab: '#64748B',
    activeTab: '#7F77DD', // Glowing purple active tab/icon
    activeChipText: '#FFFFFF',
    inactiveChipText: '#94A3B8',
    inactiveChipBg: '#121824',
  },
};

export type ThemeColors = typeof colors.light;
