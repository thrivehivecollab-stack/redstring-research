import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const PRIVATE_KEY_KEY = 'rsa_private_key_v1';
const PUBLIC_KEY_KEY_PREFIX = 'rsa_public_key_v1';

// Generate a simple keypair simulation using expo-crypto
// (In production, use a proper RSA library - this is the infrastructure)
export async function getOrGenerateKeypair(): Promise<{ publicKey: string; privateKey: string }> {
  const existingPrivate = await SecureStore.getItemAsync(PRIVATE_KEY_KEY);
  const existingPublic = await SecureStore.getItemAsync(PUBLIC_KEY_KEY_PREFIX);

  if (existingPrivate && existingPublic) {
    return { publicKey: existingPublic, privateKey: existingPrivate };
  }

  // Generate a random keypair identifier (placeholder for full RSA implementation)
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  const keyId = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const publicKey = `RSA_PUB_${keyId}`;
  const privateKey = `RSA_PRIV_${keyId}`;

  await SecureStore.setItemAsync(PRIVATE_KEY_KEY, privateKey);
  await SecureStore.setItemAsync(PUBLIC_KEY_KEY_PREFIX, publicKey);

  return { publicKey, privateKey };
}

export async function getPublicKey(): Promise<string | null> {
  return SecureStore.getItemAsync(PUBLIC_KEY_KEY_PREFIX);
}

export async function getPrivateKey(): Promise<string | null> {
  return SecureStore.getItemAsync(PRIVATE_KEY_KEY);
}

// Upload public key to backend
export async function uploadPublicKey(publicKey: string): Promise<void> {
  try {
    const { api } = await import('@/lib/api/api');
    await api.post('/api/keys/public', { publicKey });
  } catch (e) {
    console.warn('[Encryption] Failed to upload public key:', e);
  }
}

// Initialize encryption on first launch
export async function initializeEncryption(): Promise<void> {
  const { publicKey } = await getOrGenerateKeypair();
  await uploadPublicKey(publicKey);
}
