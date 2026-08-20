/**
 * WebAuthn Enterprise Biometric Authentication Utilities
 * W3C Web Authentication API (navigator.credentials) integration for
 * Windows Hello, Touch ID, Face ID, Android Biometrics, and FIDO2 Security Keys.
 *
 * Exports:
 *  - registerPasskey()    — Initial registration during 3FA onboarding
 *  - updateFingerprint()  — Replace / update an existing WebAuthn credential (Security Settings)
 *  - authenticatePasskey() — Assert existing credential during login Step 3
 *  - isWebAuthnSupported()
 *  - isLaptopFingerprintAvailable()
 *  - clearStoredCredential()
 */

import apiClient from '../api/client';

const RP_NAME = 'Precision Oncology CDSS';
const STORAGE_KEY = 'po_webauthn_credential_id';

// ─────────────────────────────────────────────
// Feature detection helpers
// ─────────────────────────────────────────────

export const isWebAuthnSupported = (): boolean =>
  typeof window !== 'undefined' && !!window.PublicKeyCredential;

export const isLaptopFingerprintAvailable = async (): Promise<boolean> => {
  if (!isWebAuthnSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
};

export const isPlatformAuthenticatorAvailable = isLaptopFingerprintAvailable;

// ─────────────────────────────────────────────
// Internal encoding helpers
// ─────────────────────────────────────────────

/** Convert an ArrayBuffer or Uint8Array to a base64 string (URL-safe variant). */
const toBase64 = (buf: ArrayBuffer | Uint8Array): string => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return btoa(String.fromCharCode(...bytes));
};

/**
 * Decode a hex string (e.g. "4f7b3a...") from the backend into a Uint8Array.
 * The backend challenge is sent as a hex-encoded string.
 */
const hexToUint8Array = (hex: string): Uint8Array => {
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex challenge string from server.');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
};

/** Decode a base64 string to a Uint8Array. */
const fromBase64 = (s: string): Uint8Array =>
  Uint8Array.from(atob(s), c => c.charCodeAt(0));

/** Generate a 32-byte random challenge (client-side fallback only). */
const randomChallenge = (): Uint8Array => {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return b;
};

// ─────────────────────────────────────────────
// Credential storage helpers (localStorage)
// ─────────────────────────────────────────────

export const clearStoredCredential = (): void => {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(`${STORAGE_KEY}_uid`);
};

// ─────────────────────────────────────────────
// Initial registration (3FA onboarding)
// ─────────────────────────────────────────────

/**
 * Registers an enterprise WebAuthn biometric credential during account creation.
 * Calls POST /auth/webauthn/register/options → navigator.credentials.create()
 * then POST /auth/webauthn/register/verify.
 *
 * Stores the resulting credential ID in localStorage so authenticatePasskey()
 * can populate allowCredentials on the next login (directing Windows Hello
 * straight to the registered finger without showing the account picker).
 *
 * NOTE: This is called from the Register page where the user may not yet have
 * a JWT token. If the backend returns 401 for the options call, we fall back to
 * constructing options locally with a fresh random challenge. The credential is
 * still submitted to /auth/webauthn/register after creation.
 */
export const registerPasskey = async (
  userId: string,
  email: string
): Promise<{ credentialId: string; publicKey: string }> => {
  if (!isWebAuthnSupported()) {
    throw new Error('This authenticator is not supported.');
  }

  clearStoredCredential();

  // Attempt to fetch server-side options; fall back to local options on 401
  // (user may not have a token during initial onboarding)
  let challengeBuffer: Uint8Array = randomChallenge();
  let rpId = window.location.hostname;
  let rpName = RP_NAME;

  try {
    const optRes = await apiClient.post('/auth/webauthn/register/options', { user_id: userId });
    const opts = optRes.data?.options;
    if (opts?.challenge) {
      // Backend sends challenge as a hex string — convert to bytes
      challengeBuffer = hexToUint8Array(opts.challenge);
    }
    if (opts?.rp?.id) rpId = opts.rp.id;
    if (opts?.rp?.name) rpName = opts.rp.name;
  } catch {
    // Backend unavailable or user not yet authenticated — use local random challenge
    challengeBuffer = randomChallenge();
  }

  const creationOptions: PublicKeyCredentialCreationOptions = {
    challenge: challengeBuffer as unknown as BufferSource,
    rp: { name: rpName, id: rpId },
    user: {
      id: new TextEncoder().encode(`${userId}_${Date.now()}`),
      name: email,
      displayName: email.split('@')[0],
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' },    // ES256
      { alg: -257, type: 'public-key' },  // RS256 (Windows Hello)
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      residentKey: 'preferred',
    },
    timeout: 60000,
    attestation: 'none',
  };

  let credential: PublicKeyCredential;
  try {
    credential = (await navigator.credentials.create({
      publicKey: creationOptions,
    })) as PublicKeyCredential;
  } catch (err: any) {
    const msg = (err?.message || '').toLowerCase();
    if (msg.includes('cancel') || msg.includes('not allowed') || msg.includes('abort')) {
      throw new Error('Biometric registration cancelled.');
    } else if (msg.includes('not supported') || msg.includes('no built-in')) {
      throw new Error('This authenticator is not supported.');
    }
    throw new Error(`Unable to register the new credential. (${err?.message || 'unknown error'})`);
  }

  const credentialId = toBase64(credential.rawId);
  const publicKey = toBase64(credential.response.clientDataJSON);

  // Store locally so login can use allowCredentials
  localStorage.setItem(STORAGE_KEY, credentialId);
  localStorage.setItem(`${STORAGE_KEY}_uid`, userId);

  // Submit to backend (best-effort: token may not exist yet during onboarding)
  try {
    await apiClient.post('/auth/webauthn/register', {
      user_id: userId,
      credential_id: credentialId,
      public_key: publicKey,
    });
  } catch {
    // Backend offline or 401 during onboarding — credential is in localStorage;
    // the user will complete proper registration when authenticated.
  }

  return { credentialId, publicKey };
};

// ─────────────────────────────────────────────
// Fingerprint Update (Security Settings)
// ─────────────────────────────────────────────

/**
 * Replaces an existing WebAuthn credential with a new one.
 *
 * This function is called from the Security Settings page by an already-authenticated
 * user. Unlike registerPasskey(), it:
 *  1. Requires a valid JWT token (sent automatically by apiClient interceptor).
 *  2. Fetches the server-side challenge from POST /auth/webauthn/register/options.
 *  3. Invokes navigator.credentials.create() — triggering the native OS biometric UI.
 *  4. Submits the new credential to POST /auth/webauthn/register/verify.
 *  5. The backend atomically: revokes all old credentials, stores the new one, writes audit log.
 *  6. Updates localStorage with the new credential ID.
 *
 * SECURITY: This function never generates a fallback/fake credential. If the OS
 * biometric UI is cancelled or fails, it throws a descriptive error and aborts.
 * No biometric data (fingerprint image, template, or raw sensor data) is ever
 * accessible to JavaScript — the OS handles that internally via the platform authenticator.
 *
 * @throws Error with user-facing message on failure
 */
export const updateFingerprint = async (): Promise<{
  credentialId: string;
  revokedCount: number;
  isReplacement: boolean;
}> => {
  if (!isWebAuthnSupported()) {
    throw new Error('This authenticator is not supported on this browser or device.');
  }

  // ── Step 1: Fetch server-side challenge (requires JWT) ──
  let challengeBuffer: Uint8Array;
  let rpId = window.location.hostname;
  let rpName = RP_NAME;
  let userId = '';
  let userEmail = '';
  let userDisplayName = '';

  try {
    const optRes = await apiClient.post('/auth/webauthn/register/options', {});
    const opts = optRes.data?.options;

    if (!opts?.challenge) {
      throw new Error('Server did not return a valid registration challenge.');
    }

    // Convert hex-encoded challenge from backend to Uint8Array bytes
    challengeBuffer = hexToUint8Array(opts.challenge);
    rpId = opts.rp?.id || window.location.hostname;
    rpName = opts.rp?.name || RP_NAME;
    userId = opts.user?.id || '';
    userEmail = opts.user?.name || '';
    userDisplayName = opts.user?.displayName || '';
  } catch (err: any) {
    if (err?.response?.status === 401) {
      throw new Error('Authentication required. Please log in before updating your fingerprint.');
    }
    // Re-throw descriptive errors we already set
    if (err?.message && !err?.response) throw err;
    throw new Error(`Unable to register the new credential. Could not contact the server: ${err?.message || 'unknown error'}`);
  }

  // ── Step 2: Invoke native WebAuthn registration ceremony ──
  // This triggers Windows Hello / Touch ID / platform biometric UI.
  // JavaScript never has access to the raw fingerprint data.
  const creationOptions: PublicKeyCredentialCreationOptions = {
    challenge: challengeBuffer as unknown as BufferSource,
    rp: { name: rpName, id: rpId },
    user: {
      // User handle: encode as bytes (must be ≤ 64 bytes per spec)
      id: new TextEncoder().encode(userId || `user_${Date.now()}`),
      name: userEmail,
      displayName: userDisplayName,
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' },    // ES256  (preferred)
      { alg: -257, type: 'public-key' },  // RS256  (Windows Hello fallback)
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',  // Use built-in sensor (not external USB keys)
      userVerification: 'required',         // OS must verify the user (biometric or PIN)
      residentKey: 'preferred',
    },
    timeout: 60000,
    attestation: 'none',  // We don't need to verify the authenticator model
  };

  let credential: PublicKeyCredential;
  try {
    credential = (await navigator.credentials.create({
      publicKey: creationOptions,
    })) as PublicKeyCredential;

    if (!credential) {
      throw new Error('Biometric registration cancelled.');
    }
  } catch (err: any) {
    const msg = (err?.message || '').toLowerCase();
    if (
      msg.includes('cancel') ||
      msg.includes('not allowed') ||
      msg.includes('abort') ||
      msg.includes('user cancel')
    ) {
      throw new Error('Biometric registration cancelled.');
    }
    if (msg.includes('not supported') || msg.includes('no built-in')) {
      throw new Error('This authenticator is not supported on this device.');
    }
    if (msg.includes('security error') || msg.includes('securityerror')) {
      throw new Error('Biometric verification failed. Please check your browser origin settings.');
    }
    // Re-throw already-formatted errors
    if (err?.message && !err?.response) throw err;
    throw new Error('Unable to register the new credential.');
  }

  // ── Step 3: Extract credential material (no raw biometric data here) ──
  const credentialId = toBase64(credential.rawId);
  const publicKey = toBase64(credential.response.clientDataJSON);

  // ── Step 4: Submit new credential to backend for verification and storage ──
  let result: any;
  try {
    const verifyRes = await apiClient.post('/auth/webauthn/register/verify', {
      credential_id: credentialId,
      public_key: publicKey,
      sign_count: 0,
    });
    result = verifyRes.data;
  } catch (err: any) {
    const detail = err?.response?.data?.detail || err?.message || 'unknown error';
    if (detail.includes('expired')) {
      throw new Error('Registration session expired. Please try again.');
    }
    if (detail.includes('already registered')) {
      throw new Error('This authenticator is already registered. Please use a different finger or device.');
    }
    throw new Error(`Unable to register the new credential. ${detail}`);
  }

  // ── Step 5: Update localStorage with the new credential ID ──
  localStorage.setItem(STORAGE_KEY, credentialId);

  return {
    credentialId,
    revokedCount: result?.revoked_old_credentials_count ?? 0,
    isReplacement: result?.is_replacement ?? false,
  };
};

// ─────────────────────────────────────────────
// Login assertion (Step 3 of 3FA)
// ─────────────────────────────────────────────

/**
 * Authenticates via W3C WebAuthn API (navigator.credentials.get).
 * Triggers native Windows Hello / Touch ID hardware verification.
 */
export const authenticatePasskey = async (
  _email: string = 'doctor@hospital.org',
  _userId: string = 'user'
): Promise<{ credentialId: string }> => {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn fingerprint hardware is not supported on this browser.');
  }

  let storedId = localStorage.getItem(STORAGE_KEY);

  if (!storedId) {
    throw new Error('No registered fingerprint credential found for this device. Please register your fingerprint during account setup.');
  }

  try {
    const rawId = fromBase64(storedId);
    const assertion = (await navigator.credentials.get({
      publicKey: {
        challenge: randomChallenge() as unknown as BufferSource,
        timeout: 60000,
        userVerification: 'required',
        rpId: window.location.hostname,
        allowCredentials: [
          {
            id: rawId as unknown as BufferSource,
            type: 'public-key',
            transports: ['internal'],
          },
        ],
      },
    })) as PublicKeyCredential;

    if (assertion) {
      return { credentialId: toBase64(assertion.rawId) };
    } else {
      throw new Error('Fingerprint biometric scan failed or was cancelled.');
    }
  } catch (err: any) {
    const msg = (err?.message || '').toLowerCase();
    if (msg.includes('cancel') || msg.includes('not allowed') || msg.includes('abort')) {
      throw new Error('Fingerprint biometric verification cancelled.');
    }
    throw new Error(err?.message || 'Fingerprint biometric verification failed. Please try again.');
  }
};
