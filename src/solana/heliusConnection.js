import { Connection } from '@solana/web3.js';

export const PUBLIC_FALLBACK_RPCS = [
  'https://solana-rpc.publicnode.com',
  'https://api.mainnet-beta.solana.com',
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

// Global cooldown flag when Helius RPC returns 429
let heliusRateLimitedUntil = 0;

export function markHeliusRateLimited(durationMs = 30000) {
  heliusRateLimitedUntil = Date.now() + durationMs;
}

export function isHeliusRateLimited() {
  return Date.now() < heliusRateLimitedUntil;
}

export function getEffectiveRpcUrl(heliusApiKey = null) {
  const isValid = isValidHeliusApiKey(heliusApiKey);
  const effectiveKey = isValid ? heliusApiKey.trim() : DEFAULT_HELIUS_API_KEY;

  if (effectiveKey.startsWith('http://') || effectiveKey.startsWith('https://')) {
    return effectiveKey;
  }

  // If Helius is temporarily 429 rate limited, seamlessly route to high-speed public node
  if (isHeliusRateLimited()) {
    return PUBLIC_FALLBACK_RPCS[0];
  }

  return `https://mainnet.helius-rpc.com/?api-key=${effectiveKey}`;
}

export function createSolanaConnection(heliusApiKey = null) {
  const rpcUrl = getEffectiveRpcUrl(heliusApiKey);
  return new Connection(rpcUrl, {
    commitment: 'confirmed',
    disableRetryOnRateLimit: true,
  });
}

// Standalone fallback connection to public RPC
export function createFallbackConnection() {
  return new Connection(PUBLIC_FALLBACK_RPCS[0], {
    commitment: 'confirmed',
    disableRetryOnRateLimit: true,
  });
}

