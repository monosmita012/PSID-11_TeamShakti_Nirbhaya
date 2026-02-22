/**
 * Fetches ICE servers for WebRTC. Uses TURN when configured for cross-network connectivity.
 * Without TURN, connections often fail when victim and police are on different devices/networks.
 *
 * To enable TURN (required for different laptops/networks):
 * 1. Sign up at https://dashboard.metered.ca/signup?tool=turnserver
 * 2. Get your credentials URL (e.g. https://yourapp.metered.live/api/v1/turn/credentials?apiKey=YOUR_KEY)
 * 3. Add to .env: VITE_METERED_TURN_CREDENTIALS_URL=your_full_url
 */

const DEFAULT_STUN_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.stunprotocol.org:3478' },
];

export async function getIceServers(): Promise<RTCIceServer[]> {
  const credentialsUrl = import.meta.env.VITE_METERED_TURN_CREDENTIALS_URL;

  if (credentialsUrl && typeof credentialsUrl === 'string') {
    try {
      const response = await fetch(credentialsUrl);
      if (response.ok) {
        const data = await response.json();
        const turnServers = Array.isArray(data) ? data : (data?.iceServers || []);
        if (turnServers.length > 0) {
          console.log('✅ TURN servers loaded for cross-network connectivity');
          return [...turnServers, ...DEFAULT_STUN_SERVERS];
        }
      }
    } catch (err) {
      console.warn('Failed to fetch TURN credentials, using STUN only:', err);
    }
  }

  return DEFAULT_STUN_SERVERS;
}
