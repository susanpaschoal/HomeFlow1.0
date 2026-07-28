import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkTheme, lightTheme, Theme } from './tokens';

type Mode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  mode: Mode;
  setMode: (m: Mode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: lightTheme,
  mode: 'system',
  setMode: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const system = useColorScheme();
  const [mode, setModeState] = useState<Mode>('system');

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem('theme_mode');
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setModeState(stored);
      }
    })();
  }, []);

  const setMode = useCallback((m: Mode) => {
    setModeState(m);
    AsyncStorage.setItem('theme_mode', m);
  }, []);

  const effective = mode === 'system' ? system : mode;
  const theme = effective === 'dark' ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, mode, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
