'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes

export default function AutoLogout() {
  const router = useRouter();
  const lastActivityRef = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch {
      // fallback
    }
    router.push('/login');
    router.refresh();
  }, [router]);

  const checkInactivity = useCallback(() => {
    const now = Date.now();
    if (now - lastActivityRef.current >= INACTIVITY_TIMEOUT) {
      handleLogout();
    }
  }, [handleLogout]);

  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    // Check periodically in case setTimeout was throttled in background
    timerRef.current = setInterval(checkInactivity, 60 * 1000);

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    events.forEach(event => window.addEventListener(event, updateActivity, { passive: true }));

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkInactivity();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      events.forEach(event => window.removeEventListener(event, updateActivity));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkInactivity, updateActivity]);

  return null;
}
