import { browser } from '$app/environment';
import { createWebHaptics } from 'web-haptics/svelte';

let haptics: ReturnType<typeof createWebHaptics> | null = null;

// Initialize haptics only on the client
if (browser) {
  haptics = createWebHaptics({ showSwitch: false });
}

export function trigger(type: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning' | 'selection' = 'light') {
  if (!browser || !haptics?.isSupported) return;
  
  // Map to web-haptics pattern format
  const patterns: Record<string, any> = {
    light: [{ duration: 15, intensity: 0.4 }],
    medium: [{ duration: 25, intensity: 0.7 }],
    heavy: [{ duration: 35, intensity: 1 }],
    success: 'success',
    error: 'error',
    warning: 'warning',
    selection: 'selection'
  };
  
  const pattern = patterns[type];
  if (pattern) {
    haptics.trigger(pattern);
  }
}

export function hapticsSupported(): boolean {
  return browser && (haptics?.isSupported ?? false);
}
