/**
 * Proctoring Engine
 * Handles: fullscreen enforcement, tab-switch detection, context menu blocking.
 * Returns a cleanup function to remove all listeners.
 */

export function startProctoring({ onViolation, onAutoSubmit }) {
  const violations = [];

  // 1. Fullscreen exit detection
  const handleFullscreenChange = () => {
    if (!document.fullscreenElement) {
      violations.push('fullscreen-exit');
      onViolation('fullscreen-exit');
      onAutoSubmit('fullscreen-exit');
    }
  };

  // 2. Tab / window visibility change
  const handleVisibilityChange = () => {
    if (document.hidden) {
      violations.push('tab-switch');
      onViolation('tab-switch');
      onAutoSubmit('tab-switch');
    }
  };

  // 3. Block right-click
  const blockContextMenu = (e) => e.preventDefault();

  // 4. Block keyboard shortcuts (Alt+Tab, etc. — partial browser support)
  const blockKeys = (e) => {
    // Block F12, Ctrl+Shift+I, Ctrl+U
    if (
      e.key === 'F12' ||
      (e.ctrlKey && e.shiftKey && e.key === 'I') ||
      (e.ctrlKey && e.key === 'u')
    ) {
      e.preventDefault();
    }
  };

  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  document.addEventListener('contextmenu', blockContextMenu);
  document.addEventListener('keydown', blockKeys);

  // Return cleanup
  return () => {
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    document.removeEventListener('contextmenu', blockContextMenu);
    document.removeEventListener('keydown', blockKeys);
  };
}

export function requestFullscreen() {
  return document.documentElement.requestFullscreen().catch(() => {});
}

export function exitFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
}

export function getLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { timeout: 10000 }
    );
  });
}

export async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    return stream;
  } catch (err) {
    throw new Error('Camera access denied: ' + err.message);
  }
}
