'use client';

import { useEffect } from 'react';

export default function ForceDesktopViewport() {
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    if (!meta) return;
    const ua = navigator.userAgent.toLowerCase();
    const isMobile =
      /android|iphone|ipad|ipod|blackberry|bb10|mini|windows\sce|palm/i.test(ua);
    if (isMobile) {
      const scale = window.innerWidth / 1280;
      meta.setAttribute('content', `width=1280, initial-scale=${scale}`);
    }
  }, []);

  return null;
}
