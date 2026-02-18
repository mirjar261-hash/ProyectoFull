'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const SESSION_LIMIT = 2 * 60 * 60 * 1000; // 2 hours in ms
const CHECK_INTERVAL = 60 * 1000; // check every minute

export default function SessionTimeout() {
  const router = useRouter();

  useEffect(() => {
    const updateActivity = () => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('lastActivity', Date.now().toString());
      }
    };

    const logout = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('empresaToken');
      localStorage.removeItem('empresaId');
      localStorage.removeItem('lastActivity');
      // Force a full page reload to avoid stale cached assets
      window.location.href = '/';
    };

    updateActivity();

    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    events.forEach((evt) => window.addEventListener(evt, updateActivity));

    const interval = setInterval(() => {
      const last = parseInt(localStorage.getItem('lastActivity') || '0', 10);
      const token = localStorage.getItem('token');
      if (token && Date.now() - last > SESSION_LIMIT) {
        logout();
      }
    }, CHECK_INTERVAL);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, updateActivity));
      clearInterval(interval);
    };
  }, [router]);

  return null;
}

