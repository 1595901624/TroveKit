import { createContext, useContext, ReactNode } from 'react';
import { usePersistentState } from '../hooks/usePersistentState';

export interface FeaturePreference {
  visible: boolean;
  isFavorite: boolean;
}

export type FeaturePreferences = Record<string, FeaturePreference>;

interface FeaturePreferencesContextType {
  preferences: FeaturePreferences;
  updatePreference: (id: string, updates: Partial<FeaturePreference>) => void;
  getPreference: (id: string) => FeaturePreference;
}

const defaultPreference: FeaturePreference = {
  visible: true,
  isFavorite: false,
};

const FeaturePreferencesContext = createContext<FeaturePreferencesContextType | undefined>(undefined);

export function FeaturePreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = usePersistentState<FeaturePreferences>('feature-preferences', {});

  const updatePreference = (id: string, updates: Partial<FeaturePreference>) => {
    setPreferences((prev) => {
      const current = prev[id] || defaultPreference;
      return {
        ...prev,
        [id]: { ...current, ...updates },
      };
    });
  };

  const getPreference = (id: string) => {
    return preferences[id] || defaultPreference;
  };

  return (
    <FeaturePreferencesContext.Provider value={{ preferences, updatePreference, getPreference }}>
      {children}
    </FeaturePreferencesContext.Provider>
  );
}

export function useFeaturePreferences() {
  const context = useContext(FeaturePreferencesContext);
  if (!context) {
    throw new Error('useFeaturePreferences must be used within a FeaturePreferencesProvider');
  }
  return context;
}
