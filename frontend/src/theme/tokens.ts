import { StyleSheet } from 'react-native';

export const lightTheme = {
  mode: 'light' as const,
  surface: '#F9FAFB',
  onSurface: '#111827',
  surfaceSecondary: '#FFFFFF',
  onSurfaceSecondary: '#374151',
  surfaceTertiary: '#F3F4F6',
  onSurfaceTertiary: '#6B7280',
  surfaceInverse: '#111827',
  onSurfaceInverse: '#FFFFFF',
  brand: '#2D5A46',
  brandPrimary: '#2D5A46',
  onBrandPrimary: '#FFFFFF',
  brandSecondary: '#D3E4DB',
  onBrandSecondary: '#1E3B2E',
  brandTertiary: '#EAF2EE',
  onBrandTertiary: '#2D5A46',
  success: '#1F7A4D',
  warning: '#B0652D',
  error: '#A33A3A',
  info: '#4A5568',
  border: '#E5E7EB',
  borderStrong: '#D1D5DB',
  divider: '#F3F4F6',
};

export const darkTheme = {
  mode: 'dark' as const,
  surface: '#0A0A0A',
  onSurface: '#F3F4F6',
  surfaceSecondary: '#171717',
  onSurfaceSecondary: '#D1D5DB',
  surfaceTertiary: '#262626',
  onSurfaceTertiary: '#9CA3AF',
  surfaceInverse: '#F9FAFB',
  onSurfaceInverse: '#111827',
  brand: '#5CB88E',
  brandPrimary: '#5CB88E',
  onBrandPrimary: '#081A12',
  brandSecondary: '#1E3B2E',
  onBrandSecondary: '#A3D9BE',
  brandTertiary: '#102A1F',
  onBrandTertiary: '#5CB88E',
  success: '#4CC486',
  warning: '#E69C60',
  error: '#EF7A7A',
  info: '#A0AEC0',
  border: '#262626',
  borderStrong: '#404040',
  divider: '#1A1A1A',
};

export type Theme = typeof lightTheme;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
export const radius = { sm: 6, md: 12, lg: 20, pill: 999 };

export const shadow = (mode: 'light' | 'dark') =>
  mode === 'light'
    ? {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
      }
    : {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 2,
      };
