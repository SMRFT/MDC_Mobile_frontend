import { Platform } from 'react-native';

const tintColorLight = '#15803d'; // MDG Green
const tintColorDark = '#34d399';

export const Colors = {
  light: {
    text: '#1e293b',
    textSecondary: '#64748b',
    background: '#ffffff',
    card: '#f8fafc',
    border: '#e2e8f0',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#64748b',
    tabIconSelected: tintColorLight,
    surface: '#ffffff',
    primary: '#15803d', // Green
    secondary: '#f59e0b', // Orange (Gears)
    warning: '#f59e0b',
    danger: '#ef4444',
  },
  dark: {
    text: '#f8fafc',
    textSecondary: '#94a3b8',
    background: '#0f172a',
    card: '#1e293b',
    border: '#334155',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    surface: '#1e293b',
    primary: '#34d399',
    secondary: '#fbbf24',
    warning: '#fbbf24',
    danger: '#f87171',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
