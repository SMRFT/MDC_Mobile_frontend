import { Platform } from 'react-native';

const tintColorLight = '#15803d'; // MDG Green
const tintColorDark = '#34d399';

export const Colors = {
  light: {
    text: '#0f172a',
    textSecondary: '#64748b',
    background: '#f8fafc',
    card: '#ffffff',
    cardAlt: '#f1f5f9',
    border: '#e2e8f0',
    borderGlow: 'rgba(16, 185, 129, 0.2)',
    tint: tintColorLight,
    icon: '#64748b',
    tabIconDefault: '#64748b',
    tabIconSelected: tintColorLight,
    surface: '#ffffff',
    primary: '#059669', // Emerald
    primaryDark: '#047857',
    primaryLight: '#d1fae5',
    secondary: '#4338ca', // Indigo
    accent: '#0284c7', // Sky blue
    warning: '#d97706',
    danger: '#ef4444',
    success: '#10b981',
    info: '#3b82f6',
  },
  dark: {
    text: '#f8fafc',
    textSecondary: '#94a3b8',
    background: '#0a0f1d',
    card: '#131b2e',
    cardAlt: '#1e293b',
    border: '#1e293b',
    borderGlow: 'rgba(52, 211, 153, 0.25)',
    tint: tintColorDark,
    icon: '#94a3b8',
    tabIconDefault: '#64748b',
    tabIconSelected: tintColorDark,
    surface: '#131b2e',
    primary: '#10b981', // Vivid Emerald
    primaryDark: '#059669',
    primaryLight: 'rgba(16, 185, 129, 0.15)',
    secondary: '#6366f1', // Vivid Indigo
    accent: '#38bdf8',
    warning: '#f59e0b',
    danger: '#f87171',
    success: '#34d399',
    info: '#60a5fa',
  },
};

export const TherapyPalette = {
  'Speech Therapy': { color: '#8b5cf6', bg: '#f5f3ff', darkBg: '#2e1065', icon: 'chatbubbles-outline' as const },
  'Occupational Therapy': { color: '#4f46e5', bg: '#eef2ff', darkBg: '#1e1b4b', icon: 'hand-left-outline' as const },
  'Applied Behavior Analysis (ABA)': { color: '#0284c7', bg: '#f0f9ff', darkBg: '#082f49', icon: 'bulb-outline' as const },
  'Physiotherapy': { color: '#0d9488', bg: '#f0fdfa', darkBg: '#134e4a', icon: 'body-outline' as const },
  'Special Education': { color: '#10b981', bg: '#ecfdf5', darkBg: '#064e3b', icon: 'book-outline' as const },
  'Social Training Class': { color: '#d97706', bg: '#fffbeb', darkBg: '#78350f', icon: 'people-outline' as const },
  'Cognitive Therapy': { color: '#e11d48', bg: '#fff1f2', darkBg: '#881337', icon: 'flash-outline' as const },
  'General': { color: '#059669', bg: '#ecfdf5', darkBg: '#064e3b', icon: 'checkbox-outline' as const }
};

export const GoalStatusPalette = {
  'Achieved': { label: 'Achieved', color: '#10b981', bg: '#d1fae5', darkBg: '#064e3b' },
  'Developing': { label: 'Developing', color: '#0284c7', bg: '#e0f2fe', darkBg: '#082f49' },
  'Emerging': { label: 'Emerging', color: '#f59e0b', bg: '#fef3c7', darkBg: '#78350f' },
  'Not Started': { label: 'Not Started', color: '#64748b', bg: '#f1f5f9', darkBg: '#1e293b' },
  'In Progress': { label: 'In Progress', color: '#f59e0b', bg: '#fef3c7', darkBg: '#78350f' }
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
