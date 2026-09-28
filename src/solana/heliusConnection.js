import { Connection } from '@solana/web3.js';

// Free high-reliability CORS-enabled public RPC endpoints for fallback
export const PUBLIC_FALLBACK_RPCS = [
  'https://api.mainnet-beta.solana.com',
  'https://rpc.ankr.com/solana',
  'https://solana-rpc.publicnode.com',
];

export function createSolanaConnection(heliusApiKey = null) {
  const hasKey = Boolean(heliusApiKey && heliusApiKey.trim());
  let rpcUrl = 'https://solana-rpc.publicnode.com';

  if (hasKey) {
    const cleanKey = heliusApiKey.trim();
    if (cleanKey.startsWith('http://') || cleanKey.startsWith('https://')) {
      rpcUrl = cleanKey;
    } else {
      // Helius API Key UUID
      rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${cleanKey}`;
    }
  }

  return new Connection(rpcUrl, {
    commitment: 'confirmed',
    disableRetryOnRateLimit: false,
  });
}

