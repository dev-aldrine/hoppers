import { Connection } from '@solana/web3.js';

export const PUBLIC_FALLBACK_RPCS = [
  'https://api.mainnet-beta.solana.com',
  'https://rpc.ankr.com/solana',
  'https://1rpc.io/sol',
];

export const DEFAULT_HELIUS_API_KEY = 'aac38acb-66a6-4494-870e-8bb5c14c051a';

export function isValidHeliusApiKey(key) {
  if (!key || typeof key !== 'string') return false;
  const clean = key.trim();
  if (clean.startsWith('http://') || clean.startsWith('https://')) return true;
  // If it's a pump token mint or contains non-hex chars other than hyphens, it is not a valid helius key
  if (clean.toLowerCase().endsWith('pump') || clean.length > 40) return false;
  return /^[0-9a-fA-F-]{20,40}$/.test(clean);
}

export function createSolanaConnection(heliusApiKey = null) {
  const isValid = isValidHeliusApiKey(heliusApiKey);
  const effectiveKey = isValid ? heliusApiKey.trim() : DEFAULT_HELIUS_API_KEY;
  let rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${effectiveKey}`;

  if (effectiveKey.startsWith('http://') || effectiveKey.startsWith('https://')) {
    rpcUrl = effectiveKey;
  }

  return new Connection(rpcUrl, {
    commitment: 'confirmed',
    disableRetryOnRateLimit: true,
  });
}

