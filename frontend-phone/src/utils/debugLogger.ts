// Shared debug logging utility
export const sendDebugInfo = async (type: string, data: any, deviceId: string = 'frontend') => {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
  try {
    await fetch(`${BACKEND_URL}/api/debug`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        deviceId,
        data,
        timestamp: new Date().toISOString()
      })
    });
  } catch (e) {
    // Ignore debug logging errors
  }
};
