import { Connection } from '@solana/web3.js';

export const PUBLIC_FALLBACK_RPCS = [
  'https://api.mainnet-beta.solana.com',
  'https://rpc.ankr.com/solana',
  'https://1rpc.io/sol',
];

export function createSolanaConnection(heliusApiKey = null) {
  const hasKey = Boolean(heliusApiKey && heliusApiKey.trim());
  let rpcUrl = 'https://api.mainnet-beta.solana.com';

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
    disableRetryOnRateLimit: true,
  });
}

