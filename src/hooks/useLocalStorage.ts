import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

// Este hook substitui o uso direto de localStorage
// Ele automaticamente prefixa as chaves com o email do usuário logado

function getStorageValue<T>(key: string, defaultValue: T, userPrefix: string): T {
  const saved = localStorage.getItem(`${userPrefix}_${key}`);
  if (saved) {
    return JSON.parse(saved);
  }
  return defaultValue;
}

export function useLocalStorage<T>(key: string, defaultValue: T) {
  const { user } = useAuth();
  const userPrefix = user?.email || 'guest_user'; // Fallback para um usuário não logado

  const [value, setValue] = useState(() => {
    return getStorageValue(key, defaultValue, userPrefix);
  });

  useEffect(() => {
    localStorage.setItem(`${userPrefix}_${key}`, JSON.stringify(value));
  }, [key, value, userPrefix]);

  return [value, setValue] as const;
}
