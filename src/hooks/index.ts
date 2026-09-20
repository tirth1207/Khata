// Khata - Custom Hooks
// Reusable React hooks for the application

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { Platform } from 'react-native';

// Theme hook
export function useTheme() {
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  
  useEffect(() => {
    // Load from settings (would use AsyncStorage or settings service)
    // For now, default to system
  }, []);
  
  const resolvedTheme = theme === 'system' ? (systemColorScheme ?? 'light') : theme;
  
  return {
    theme,
    resolvedTheme,
    setTheme,
    isDark: resolvedTheme === 'dark',
  };
}

// Currency formatting hook
export function useCurrency(currencyCode: string = 'INR') {
  const { formatMoney, formatMoneySigned, fromMinorUnits, toMinorUnits } = await import('@/types');
  
  return useMemo(() => ({
    format: (minorUnits: number) => formatMoney(minorUnits, currencyCode as any),
    formatSigned: (minorUnits: number) => formatMoneySigned(minorUnits, currencyCode as any),
    fromMinor: (minorUnits: number) => fromMinorUnits(minorUnits, currencyCode as any),
    toMinor: (amount: number) => toMinorUnits(amount, currencyCode as any),
  }), [currencyCode]);
}

// Debounce hook
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  
  return debouncedValue;
}

// Local storage hook (AsyncStorage wrapper)
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    const loadValue = async () => {
      try {
        const { getItem } = await import('@/lib/storage/database');
        // This would use AsyncStorage in practice
        setIsLoaded(true);
      } catch {
        setIsLoaded(true);
      }
    };
    loadValue();
  }, [key]);
  
  const setValue = useCallback(async (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      // await AsyncStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error('Error saving to local storage:', error);
    }
  }, [key, storedValue]);
  
  return [storedValue, setValue, isLoaded] as const;
}

// Async operation hook
export function useAsync<T, E = Error>(
  asyncFn: () => Promise<T>,
  deps: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<E | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    let mounted = true;
    
    const execute = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await asyncFn();
        if (mounted) setData(result);
      } catch (err) {
        if (mounted) setError(err as E);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    
    execute();
    
    return () => { mounted = false; };
  }, deps);
  
  const refetch = useCallback(() => {
    setLoading(true);
    setError(null);
    asyncFn().then(setData).catch(setError).finally(() => setLoading(false));
  }, [asyncFn]);
  
  return { data, error, loading, refetch };
}

// Pagination hook
export function usePagination<T>(
  fetchFn: (page: number, pageSize: number) => Promise<{ items: T[]; total: number; totalPages: number }>,
  pageSize: number = 50
) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  
  const load = useCallback(async (pageNum: number, append = false) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);
    setError(null);
    
    try {
      const result = await fetchFn(pageNum, pageSize);
      if (append) {
        setItems(prev => [...prev, ...result.items]);
      } else {
        setItems(result.items);
      }
      setTotal(result.total);
      setTotalPages(result.totalPages);
      setHasMore(pageNum < result.totalPages);
      setPage(pageNum);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [fetchFn, pageSize]);
  
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      load(page + 1, true);
    }
  }, [load, page, hasMore, loadingMore, loading]);
  
  const refresh = useCallback(() => load(1, false), [load]);
  
  useEffect(() => {
    load(1, false);
  }, []); // Only run once on mount
  
  return {
    items,
    loading,
    loadingMore,
    error,
    hasMore,
    page,
    totalPages,
    total,
    loadMore,
    refresh,
    setPage: load,
  };
}

// Form validation hook
export function useForm<T extends Record<string, any>>(
  initialValues: T,
  validate?: (values: T) => Partial<Record<keyof T, string>>
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const setFieldValue = useCallback((field: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }));
    
    // Clear error on change
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);
  
  const setFieldTouched = useCallback((field: keyof T, isTouched = true) => {
    setTouched(prev => ({ ...prev, [field]: isTouched }));
  }, []);
  
  const validateField = useCallback((field: keyof T) => {
    if (validate) {
      const fieldErrors = validate(values);
      setErrors(prev => ({ ...prev, [field]: fieldErrors[field] }));
      return !fieldErrors[field];
    }
    return true;
  }, [validate, values]);
  
  const validateAll = useCallback(() => {
    if (validate) {
      const fieldErrors = validate(values);
      setErrors(fieldErrors);
      return Object.keys(fieldErrors).length === 0;
    }
    return true;
  }, [validate, values]);
  
  const handleSubmit = useCallback(async (onSubmit: (values: T) => Promise<void>) => {
    setIsSubmitting(true);
    const isValid = validateAll();
    
    // Mark all fields as touched
    const allTouched: Partial<Record<keyof T, boolean>> = {};
    Object.keys(values).forEach(k => { allTouched[k as keyof T] = true; });
    setTouched(allTouched);
    
    if (isValid) {
      try {
        await onSubmit(values);
      } catch (err) {
        console.error('Form submit error:', err);
      }
    }
    setIsSubmitting(false);
  }, [validateAll, values]);
  
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);
  
  return {
    values,
    errors,
    touched,
    isSubmitting,
    setFieldValue,
    setFieldTouched,
    validateField,
    validateAll,
    handleSubmit,
    reset,
    setValues,
    setErrors,
  };
}

// Keyboard handling hook
export function useKeyboard() {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    // In a real app, use Keyboard.addListener from react-native
    // This is a placeholder
  }, []);
  
  return { isVisible };
}

// Safe area insets hook
export function useSafeArea() {
  const [insets, setInsets] = useState({ top: 0, bottom: 0, left: 0, right: 0 });
  
  useEffect(() => {
    // In a real app, use useSafeAreaInsets from react-native-safe-area-context
    // This is a placeholder
  }, []);
  
  return insets;
}

// Media query hook (for web responsiveness)
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  
  useEffect(() => {
    if (Platform.OS !== 'web') {
      setMatches(false);
      return;
    }
    
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);
    
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mediaQuery.addEventListener('change', handler);
    
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);
  
  return matches;
}

// Breakpoint hooks
export const useIsMobile = () => useMediaQuery('(max-width: 639px)');
export const useIsTablet = () => useMediaQuery('(min-width: 640px) and (max-width: 1023px)');
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)');

// Animation hook
export function useAnimation() {
  const [animations, setAnimations] = useState<Map<string, any>>(new Map());
  
  const createAnimation = useCallback((key: string, config: any) => {
    // In a real app, use react-native-reanimated
    // This is a placeholder
    setAnimations(prev => new Map(prev).set(key, config));
  }, []);
  
  return { animations, createAnimation };
}

// Haptic feedback hook
export function useHaptics() {
  const impact = useCallback((style: 'light' | 'medium' | 'heavy' = 'medium') => {
    // In a real app, use expo-haptics
    // This is a placeholder
  }, []);
  
  const notification = useCallback((type: 'success' | 'warning' | 'error') => {
    // In a real app, use expo-haptics
  }, []);
  
  const selection = useCallback(() => {
    // In a real app, use expo-haptics
  }, []);
  
  return { impact, notification, selection };
}

// App lifecycle hook
export function useAppLifecycle(
  onForeground: () => void,
  onBackground: () => void
) {
  useEffect(() => {
    // In a real app, use AppState from react-native
    // This is a placeholder
  }, [onForeground, onBackground]);
}

// Network status hook
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  
  useEffect(() => {
    // In a real app, use NetInfo from @react-native-community/netinfo
    // This is a placeholder
  }, []);
  
  return isOnline;
}

// Permission hook
export function usePermission(permission: string) {
  const [status, setStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [loading, setLoading] = useState(true);
  
  const request = useCallback(async () => {
    // In a real app, use expo-permissions or react-native-permissions
    // This is a placeholder
    setStatus('granted');
  }, [permission]);
  
  useEffect(() => {
    // Check initial status
    setLoading(false);
  }, [permission]);
  
  return { status, loading, request };
}