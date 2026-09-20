// Khata - Security Service
// PIN hashing, biometric authentication, and secure storage

import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import { getSettings, updateSettings } from '../storage/database';

const PIN_KEY = 'khata_pin_hash';
const PIN_SALT_KEY = 'khata_pin_salt';
const BIOMETRIC_ENABLED_KEY = 'khata_biometric_enabled';
const GEMINI_API_KEY_KEY = 'khata_gemini_api_key';

// Generate a random salt
export async function generateSalt(): Promise<string> {
  const bytes = new Uint8Array(32);
  Crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

// Hash PIN with salt using PBKDF2
export async function hashPin(pin: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin + salt),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  
  const hash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
}

// Verify PIN
export async function verifyPin(pin: string): Promise<boolean> {
  const settings = await getSettings();
  
  if (!settings.pinHash || !settings.pinSalt) {
    return false; // No PIN set
  }
  
  const hash = await hashPin(pin, settings.pinSalt);
  return hash === settings.pinHash;
}

// Set new PIN
export async function setPin(pin: string): Promise<void> {
  const salt = await generateSalt();
  const hash = await hashPin(pin, salt);
  
  // Store in SecureStore
  await SecureStore.setItemAsync(PIN_KEY, hash);
  await SecureStore.setItemAsync(PIN_SALT_KEY, salt);
  
  // Update settings
  await updateSettings({ pinHash: hash, pinSalt: salt });
}

// Check if PIN is set
export async function hasPin(): Promise<boolean> {
  const settings = await getSettings();
  return !!settings.pinHash && !!settings.pinSalt;
}

// Remove PIN
export async function removePin(): Promise<void> {
  await SecureStore.deleteItemAsync(PIN_KEY);
  await SecureStore.deleteItemAsync(PIN_SALT_KEY);
  await updateSettings({ pinHash: undefined, pinSalt: undefined });
}

// Biometric authentication
export async function isBiometricAvailable(): Promise<{ available: boolean; biometryType?: LocalAuthentication.AuthenticationType }> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
    
    return {
      available: hasHardware && isEnrolled,
      biometryType: supportedTypes[0],
    };
  } catch {
    return { available: false };
  }
}

export async function authenticateWithBiometrics(promptMessage = 'Authenticate to access Khata'): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: 'Use PIN',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });
    return result.success;
  } catch {
    return false;
  }
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
  await updateSettings({ biometricEnabled: enabled });
}

export async function isBiometricEnabled(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
  return value === 'true';
}

// Gemini API Key storage (encrypted in SecureStore)
export async function setGeminiApiKey(apiKey: string): Promise<void> {
  // In production, you'd encrypt this with a key derived from the PIN
  // For now, store directly in SecureStore (which is encrypted by the OS)
  await SecureStore.setItemAsync(GEMINI_API_KEY_KEY, apiKey);
}

export async function getGeminiApiKey(): Promise<string | null> {
  return SecureStore.getItemAsync(GEMINI_API_KEY_KEY);
}

export async function removeGeminiApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(GEMINI_API_KEY_KEY);
}

// App lock state
export interface LockState {
  isLocked: boolean;
  lastUnlockedAt: number;
  failedAttempts: number;
  lockedUntil?: number;
}

let lockState: LockState = {
  isLocked: true,
  lastUnlockedAt: 0,
  failedAttempts: 0,
};

export function getLockState(): LockState {
  return { ...lockState };
}

export function unlockApp(): void {
  lockState = {
    isLocked: false,
    lastUnlockedAt: Date.now(),
    failedAttempts: 0,
  };
}

export function lockApp(): void {
  lockState = {
    ...lockState,
    isLocked: true,
  };
}

export function recordFailedAttempt(): number {
  lockState.failedAttempts++;
  
  // Lock for increasing durations after failed attempts
  if (lockState.failedAttempts >= 5) {
    const lockDuration = Math.min(lockState.failedAttempts * 30000, 3600000); // Max 1 hour
    lockState.lockedUntil = Date.now() + lockDuration;
    lockState.isLocked = true;
  }
  
  return lockState.failedAttempts;
}

export function isAppLocked(autoLockMinutes: number): boolean {
  if (!lockState.isLocked) return false;
  
  // Check if temporary lock has expired
  if (lockState.lockedUntil && Date.now() > lockState.lockedUntil) {
    lockState.lockedUntil = undefined;
    lockState.failedAttempts = 0;
    return false;
  }
  
  // Check auto-lock
  if (autoLockMinutes > 0 && lockState.lastUnlockedAt > 0) {
    const elapsed = Date.now() - lockState.lastUnlockedAt;
    if (elapsed > autoLockMinutes * 60 * 1000) {
      return true;
    }
  }
  
  return lockState.isLocked;
}

// Encryption utilities for backup
export async function generateEncryptionKey(password: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const salt = new Uint8Array(16);
  Crypto.getRandomValues(salt);
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptData(data: string, password: string): Promise<{ encrypted: string; salt: string; iv: string }> {
  const encoder = new TextEncoder();
  const salt = new Uint8Array(16);
  Crypto.getRandomValues(salt);
  const iv = new Uint8Array(12);
  Crypto.getRandomValues(iv);
  
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    key,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    derivedKey,
    encoder.encode(data)
  );
  
  return {
    encrypted: Array.from(new Uint8Array(encrypted), b => b.toString(16).padStart(2, '0')).join(''),
    salt: Array.from(salt, b => b.toString(16).padStart(2, '0')).join(''),
    iv: Array.from(iv, b => b.toString(16).padStart(2, '0')).join(''),
  };
}

export async function decryptData(encryptedHex: string, saltHex: string, ivHex: string, password: string): Promise<string> {
  const encrypted = new Uint8Array(encryptedHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  const encoder = new TextEncoder();
  
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    key,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    derivedKey,
    encrypted
  );
  
  return new TextDecoder().decode(decrypted);
}