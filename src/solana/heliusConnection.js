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
  let wsUrl = undefined;

  if (hasKey) {
    const cleanKey = heliusApiKey.trim();
    if (cleanKey.startsWith('http://') || cleanKey.startsWith('https://')) {
      rpcUrl = cleanKey;
      if (cleanKey.includes('helius-rpc.com')) {
        wsUrl = cleanKey.replace(/^http/, 'ws');
      }
    } else {
      // Helius API Key UUID
      rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${cleanKey}`;
      wsUrl = `wss://mainnet.helius-rpc.com/?api-key=${cleanKey}`;
    }
  }

  return new Connection(rpcUrl, {
    commitment: 'confirmed',
    wsEndpoint: wsUrl,
    disableRetryOnRateLimit: false,
  });
}
