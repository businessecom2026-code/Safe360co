// ─── PIN hash (SHA-256 salted with userId) ────────────────────────────────────
export async function hashPin(userId: string, pin: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(`s360:${userId}:${pin}`));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Mobile detection ─────────────────────────────────────────────────────────
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  // iOS, Android, or iPad (reports MacIntel but has touch points)
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

// ─── WebAuthn platform authenticator check ────────────────────────────────────
export async function platformAuthAvailable(): Promise<boolean> {
  try {
    return !!(
      window.PublicKeyCredential &&
      await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    );
  } catch {
    return false;
  }
}

// ─── Register a platform passkey (Face ID / Touch ID / fingerprint) ───────────
export async function registerPasskey(userId: string): Promise<string> {
  const challenge = crypto.getRandomValues(new Uint8Array(32));

  const cred = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: 'Safe360', id: window.location.hostname },
      user: {
        id: new TextEncoder().encode(userId),
        name: `safe360_${userId}`,
        displayName: 'Safe360',
      },
      pubKeyCredParams: [
        { alg: -7,   type: 'public-key' }, // ES256
        { alg: -257, type: 'public-key' }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60_000,
    },
  }) as PublicKeyCredential | null;

  if (!cred) throw new Error('registration-cancelled');

  // Encode credential rawId as base64 for localStorage storage
  return btoa(String.fromCharCode(...new Uint8Array(cred.rawId)));
}

// ─── Assert an existing passkey (returns true or throws) ─────────────────────
export async function assertPasskey(credId: string): Promise<true> {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const rawId = Uint8Array.from(atob(credId), c => c.charCodeAt(0));

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [{ type: 'public-key', id: rawId }],
      userVerification: 'required',
      timeout: 60_000,
    },
  });

  if (!assertion) throw new Error('assertion-failed');
  return true;
}

// ─── Per-user localStorage helpers ───────────────────────────────────────────
const k = (uid: string, key: string) => `safe360_${uid}_${key}`;

export const PinStore = {
  getMasterKey: (uid: string) => localStorage.getItem(k(uid, 'master_key')),
  setMasterKey: (uid: string, val: string) => localStorage.setItem(k(uid, 'master_key'), val),

  getPinHash: (uid: string) => localStorage.getItem(k(uid, 'pin_hash')),
  setPinHash: (uid: string, hash: string) => localStorage.setItem(k(uid, 'pin_hash'), hash),

  getCredId: (uid: string) => localStorage.getItem(k(uid, 'passkey_cred')),
  setCredId: (uid: string, id: string) => localStorage.setItem(k(uid, 'passkey_cred'), id),
  clearCredId: (uid: string) => localStorage.removeItem(k(uid, 'passkey_cred')),
};
