// Khata - Design System Tokens
// Semantic color system supporting light/dark themes

import { Platform } from 'react-native';

// Color Palette - Semantic Tokens
export const Colors = {
  // Backgrounds
  background: {
    primary: { light: '#FFFFFF', dark: '#000000' },
    secondary: { light: '#F2F2F7', dark: '#1C1C1E' },
    tertiary: { light: '#E5E5EA', dark: '#2C2C2E' },
    elevated: { light: '#FFFFFF', dark: '#1C1C1E' },
    overlay: { light: 'rgba(0, 0, 0, 0.4)', dark: 'rgba(0, 0, 0, 0.6)' },
  },
  
  // Surfaces (cards, sheets, modals)
  surface: {
    primary: { light: '#FFFFFF', dark: '#1C1C1E' },
    secondary: { light: '#F2F2F7', dark: '#2C2C2E' },
    tertiary: { light: '#E5E5EA', dark: '#3A3A3C' },
    pressed: { light: '#E5E5EA', dark: '#3A3A3C' },
  },
  
  // Text
  text: {
    primary: { light: '#000000', dark: '#FFFFFF' },
    secondary: { light: '#3C3C4399', dark: '#EBEBF599' }, // 60% opacity
    tertiary: { light: '#3C3C434D', dark: '#EBEBF54D' }, // 30% opacity
    quaternary: { light: '#3C3C432E', dark: '#EBEBF52E' }, // 18% opacity
    inverse: { light: '#FFFFFF', dark: '#000000' },
    link: { light: '#007AFF', dark: '#0A84FF' },
    linkPressed: { light: '#0056CC', dark: '#0060DF' },
  },
  
  // Borders & Separators
  border: {
    primary: { light: '#3C3C432E', dark: '#545458' },
    secondary: { light: '#3C3C434D', dark: '#54545899' },
    focus: { light: '#007AFF', dark: '#0A84FF' },
    error: { light: '#FF3B30', dark: '#FF453A' },
  },
  
  // Brand / Primary
  primary: {
    base: { light: '#007AFF', dark: '#0A84FF' },
    soft: { light: '#E8F0FE', dark: '#1E3A5F' },
    pressed: { light: '#0056CC', dark: '#0060DF' },
    onPrimary: { light: '#FFFFFF', dark: '#000000' },
  },
  
  // Semantic - Income (Green)
  income: {
    base: { light: '#34C759', dark: '#30D158' },
    soft: { light: '#E8F5E9', dark: '#1B3D1B' },
    onIncome: { light: '#FFFFFF', dark: '#000000' },
  },
  
  // Semantic - Expense (Red)
  expense: {
    base: { light: '#FF3B30', dark: '#FF453A' },
    soft: { light: '#FDEDEC', dark: '#3D1B1B' },
    onExpense: { light: '#FFFFFF', dark: '#000000' },
  },
  
  // Semantic - Warning (Orange/Amber)
  warning: {
    base: { light: '#FF9500', dark: '#FF9F0A' },
    soft: { light: '#FFF3E0', dark: '#3D2E1B' },
    onWarning: { light: '#000000', dark: '#FFFFFF' },
  },
  
  // Semantic - Success (Green, distinct from income)
  success: {
    base: { light: '#34C759', dark: '#30D158' },
    soft: { light: '#E8F5E9', dark: '#1B3D1B' },
    onSuccess: { light: '#FFFFFF', dark: '#000000' },
  },
  
  // Semantic - Error (Red, distinct from expense)
  error: {
    base: { light: '#FF3B30', dark: '#FF453A' },
    soft: { light: '#FDEDEC', dark: '#3D1B1B' },
    onError: { light: '#FFFFFF', dark: '#000000' },
  },
  
  // Semantic - Info (Blue)
  info: {
    base: { light: '#007AFF', dark: '#0A84FF' },
    soft: { light: '#E8F0FE', dark: '#1E3A5F' },
    onInfo: { light: '#FFFFFF', dark: '#000000' },
  },
  
  // Account Type Colors
  account: {
    bank: { light: '#007AFF', dark: '#0A84FF' },
    cash: { light: '#34C759', dark: '#30D158' },
    debit_card: { light: '#007AFF', dark: '#0A84FF' },
    credit_card: { light: '#FF3B30', dark: '#FF453A' },
    upi: { light: '#AF52DE', dark: '#BF5AF2' },
    wallet: { light: '#FF9500', dark: '#FF9F0A' },
    savings: { light: '#34C759', dark: '#30D158' },
    investment: { light: '#AF52DE', dark: '#BF5AF2' },
    fixed_deposit: { light: '#007AFF', dark: '#0A84FF' },
    custom: { light: '#8E8E93', dark: '#8E8E93' },
  },
  
  // Category Default Colors
  category: [
    '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#007AFF', 
    '#AF52DE', '#FF2D92', '#5AC8FA', '#A2845E', '#8E8E93',
  ],
  
  // Shadow
  shadow: {
    light: 'rgba(0, 0, 0, 0.1)',
    dark: 'rgba(0, 0, 0, 0.3)',
    medium: { light: 'rgba(0, 0, 0, 0.15)', dark: 'rgba(0, 0, 0, 0.4)' },
    heavy: { light: 'rgba(0, 0, 0, 0.2)', dark: 'rgba(0, 0, 0, 0.5)' },
  },
};

// Spacing Scale (4pt base)
export const Spacing = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 8,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  xxxxl: 64,
} as const;

// Border Radius
export const BorderRadius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  full: 9999,
} as const;

// Typography Scale
export const Typography = {
  // Font Families
  fontFamily: {
    sans: Platform.select({
      ios: 'system-ui',
      android: 'sans-serif',
      web: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }) || 'system-ui',
    rounded: Platform.select({
      ios: 'ui-rounded',
      android: 'sans-serif-medium',
      web: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }) || 'system-ui',
    mono: Platform.select({
      ios: 'ui-monospace',
      android: 'monospace',
      web: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
    }) || 'monospace',
  },
  
  // Font Sizes
  fontSize: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 28,
    xxxxl: 34,
    display: 40,
  },
  
  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
    loose: 2,
  },
  
  // Font Weights
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  
  // Letter Spacing
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
  },
};

// Text Styles (semantic combinations)
export const TextStyles = {
  // Display
  displayLarge: {
    fontSize: Typography.fontSize.display,
    fontWeight: Typography.fontWeight.bold,
    lineHeight: Typography.fontSize.display * Typography.lineHeight.tight,
    letterSpacing: Typography.letterSpacing.tight,
  },
  displayMedium: {
    fontSize: Typography.fontSize.xxxxl,
    fontWeight: Typography.fontWeight.bold,
    lineHeight: Typography.fontSize.xxxxl * Typography.lineHeight.tight,
    letterSpacing: Typography.letterSpacing.tight,
  },
  displaySmall: {
    fontSize: Typography.fontSize.xxxl,
    fontWeight: Typography.fontWeight.bold,
    lineHeight: Typography.fontSize.xxxl * Typography.lineHeight.tight,
    letterSpacing: Typography.letterSpacing.normal,
  },
  
  // Headlines
  headlineLarge: {
    fontSize: Typography.fontSize.xxxl,
    fontWeight: Typography.fontWeight.semibold,
    lineHeight: Typography.fontSize.xxxl * Typography.lineHeight.normal,
    letterSpacing: Typography.letterSpacing.normal,
  },
  headlineMedium: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.semibold,
    lineHeight: Typography.fontSize.xxl * Typography.lineHeight.normal,
    letterSpacing: Typography.letterSpacing.normal,
  },
  headlineSmall: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    lineHeight: Typography.fontSize.xl * Typography.lineHeight.normal,
    letterSpacing: Typography.letterSpacing.normal,
  },
  
  // Titles
  titleLarge: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    lineHeight: Typography.fontSize.lg * Typography.lineHeight.normal,
    letterSpacing: Typography.letterSpacing.normal,
  },
  titleMedium: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
    lineHeight: Typography.fontSize.md * Typography.lineHeight.normal,
    letterSpacing: Typography.letterSpacing.normal,
  },
  titleSmall: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    lineHeight: Typography.fontSize.sm * Typography.lineHeight.normal,
    letterSpacing: Typography.letterSpacing.normal,
  },
  
  // Body
  bodyLarge: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.regular,
    lineHeight: Typography.fontSize.lg * Typography.lineHeight.relaxed,
    letterSpacing: Typography.letterSpacing.normal,
  },
  bodyMedium: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.regular,
    lineHeight: Typography.fontSize.md * Typography.lineHeight.relaxed,
    letterSpacing: Typography.letterSpacing.normal,
  },
  bodySmall: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.regular,
    lineHeight: Typography.fontSize.sm * Typography.lineHeight.relaxed,
    letterSpacing: Typography.letterSpacing.normal,
  },
  
  // Labels
  labelLarge: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.medium,
    lineHeight: Typography.fontSize.md * Typography.lineHeight.normal,
    letterSpacing: Typography.letterSpacing.wide,
  },
  labelMedium: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    lineHeight: Typography.fontSize.sm * Typography.lineHeight.normal,
    letterSpacing: Typography.letterSpacing.wide,
  },
  labelSmall: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    lineHeight: Typography.fontSize.xs * Typography.lineHeight.normal,
    letterSpacing: Typography.letterSpacing.wide,
  },
  
  // Money (monospace for alignment)
  moneyLarge: {
    fontSize: Typography.fontSize.xxxl,
    fontWeight: Typography.fontWeight.semibold,
    lineHeight: Typography.fontSize.xxxl * Typography.lineHeight.tight,
    fontFamily: Typography.fontFamily.mono,
    letterSpacing: Typography.letterSpacing.tight,
  },
  moneyMedium: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    lineHeight: Typography.fontSize.xl * Typography.lineHeight.tight,
    fontFamily: Typography.fontFamily.mono,
    letterSpacing: Typography.letterSpacing.tight,
  },
  moneySmall: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.medium,
    lineHeight: Typography.fontSize.md * Typography.lineHeight.normal,
    fontFamily: Typography.fontFamily.mono,
    letterSpacing: Typography.letterSpacing.normal,
  },
};

// Shadows (elevation)
export const Shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: Colors.shadow.light,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: Colors.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: Colors.shadow.light,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: Colors.shadow.light,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: Colors.shadow.light,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 12,
  },
};

// Dark mode shadows
export const DarkShadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: Colors.shadow.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: Colors.shadow.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: Colors.shadow.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: Colors.shadow.dark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: Colors.shadow.dark,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 12,
  },
};

// Animation Durations
export const Animation = {
  duration: {
    instant: 0,
    fast: 150,
    normal: 250,
    slow: 350,
    slower: 500,
  },
  easing: {
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    spring: 'spring',
  },
};

// Layout
export const Layout = {
  screenPadding: Spacing.lg,
  cardPadding: Spacing.lg,
  sectionGap: Spacing.xl,
  itemGap: Spacing.md,
  maxContentWidth: 800,
  bottomTabHeight: Platform.select({ ios: 50, android: 80 }) ?? 50,
  headerHeight: Platform.select({ ios: 44, android: 56 }) ?? 44,
};

// Z-Index
export const ZIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  modal: 300,
  popover: 400,
  toast: 500,
  tooltip: 600,
};

// Breakpoints (for web/responsive)
export const Breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  xxl: 1536,
};

// Helper to resolve color for theme
export function resolveColor<T extends { light: string; dark: string }>(
  color: T,
  theme: 'light' | 'dark'
): string {
  return color[theme];
}

// Helper to resolve shadow for theme
export function resolveShadow(
  shadow: typeof Shadows.xs,
  theme: 'light' | 'dark'
): typeof Shadows.xs {
  return theme === 'dark' ? DarkShadows.xs as any : shadow;
}

// Theme type
export type Theme = 'light' | 'dark' | 'system';

export interface ResolvedTheme {
  colors: {
    background: Record<string, string>;
    surface: Record<string, string>;
    text: Record<string, string>;
    border: Record<string, string>;
    primary: Record<string, string>;
    income: Record<string, string>;
    expense: Record<string, string>;
    warning: Record<string, string>;
    success: Record<string, string>;
    error: Record<string, string>;
    info: Record<string, string>;
    account: Record<string, string>;
    shadow: Record<string, string>;
  };
  spacing: typeof Spacing;
  borderRadius: typeof BorderRadius;
  typography: typeof Typography;
  textStyles: typeof TextStyles;
  shadows: typeof Shadows;
  animation: typeof Animation;
  layout: typeof Layout;
  zIndex: typeof ZIndex;
}

// Create resolved theme object
export function createResolvedTheme(theme: 'light' | 'dark'): ResolvedTheme {
  const resolve = (obj: any): any => {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value && typeof value === 'object' && 'light' in value && 'dark' in value) {
        result[key] = value[theme];
      } else if (value && typeof value === 'object') {
        result[key] = resolve(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  };
  
  return {
    colors: resolve(Colors),
    spacing: Spacing,
    borderRadius: BorderRadius,
    typography: Typography,
    textStyles: TextStyles,
    shadows: theme === 'dark' ? DarkShadows : Shadows,
    animation: Animation,
    layout: Layout,
    zIndex: ZIndex,
  };
}

export const lightTheme = createResolvedTheme('light');
export const darkTheme = createResolvedTheme('dark');