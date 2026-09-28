import { PublicKey } from '@solana/web3.js';
import { getBondingCurvePDA, decodeBondingCurveData, isValidPublicKey } from './bondingCurve.js';

export const KNOWN_POOL_ADDRESSES = new Set([
  '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P', // Pump.fun Program
  'CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM', // Pump Fee Recipient
  '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1', // Raydium Authority
  'srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX', // Serum Program
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // SPL Token Program
  '11111111111111111111111111111111',            // System Program
]);

export const EXCLUDED_ADDRESSES = KNOWN_POOL_ADDRESSES;

/**
 * Fetches current live SOL/USD price from high-availability DEX / Binance endpoints
 */
export async function fetchLiveSolPrice() {
  // 1. Try Binance for instant real-time CEX index price
  try {
    const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT');
    if (res.ok) {
      const data = await res.json();
      const price = Number(data?.price);
      if (price > 10) return price;
    }
  } catch (e) {}

  // 2. Try DexScreener major liquidity pair
  try {
    const res = await fetch('https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112');
    if (res.ok) {
      const data = await res.json();
      const pairs = data?.pairs || [];
      const bestPair = pairs.find((p) => p.quoteToken?.symbol === 'USDC' || p.quoteToken?.symbol === 'USDT') || pairs[0];
      const price = Number(bestPair?.priceUsd);
      if (price > 10) return price;
    }
  } catch (e) {}

  return 119.5;
}

/**
 * Fetches token snapshot from public DEX APIs (DexScreener / Pump) for immediate instant market cap
 */
export async function fetchLiveMarketCapSnapshot(mintAddress, solUsdPrice = 155) {
  if (!mintAddress || !isValidPublicKey(mintAddress)) return null;

  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mintAddress.trim()}`);
    if (res.ok) {
      const data = await res.json();
      const pairs = data?.pairs || [];
      if (pairs.length > 0) {
        const pair = pairs.find((p) => p.dexId === 'pumpfun' || p.dexId === 'raydium') || pairs[0];
        const mcapUsd = Number(pair.fdv || pair.marketCap || 0);
        const priceUsd = Number(pair.priceUsd || 0);
        const currentSolPrice = Number(solUsdPrice) || 155;
        const priceInSol = priceUsd / currentSolPrice;
        const mcapInSol = mcapUsd / currentSolPrice;

        if (mcapUsd > 0) {
          return {
            priceInSol,
            mcapInSol,
            mcapSol: mcapInSol,
            mcapInUsd: mcapUsd,
            mcapUsd,
            migrationProgress: pair.dexId === 'raydium' ? 100 : Math.min(100, (mcapUsd / 69000) * 100),
            solUsdPrice: currentSolPrice,
            symbol: pair.baseToken?.symbol,
            name: pair.baseToken?.name,
          };
        }
      }
    }
  } catch (e) {}

  return null;
}

/**
 * Real-Time (< 200ms Latency) Bonding Curve Subscription & Buyer Detection
 * Connects directly to Solana/Helius RPC block state via onAccountChange and signature stream
 */
export function subscribeBondingCurve(
  connection,
  mintAddress,
  onUpdate,
  getSolPrice = () => 155,
  hasDedicatedWs = true,
  onTrade = null
) {
  if (!mintAddress || !isValidPublicKey(mintAddress)) return () => {};

  const cleanMint = mintAddress.trim();
  const pda = getBondingCurvePDA(cleanMint);
  let isSubscribed = true;
  let lastRealSol = null;
  let lastProcessedSig = null;
  let hasReceivedOnChain = false;

  // 1. Immediate DEX snapshot so UI updates immediately upon changing CA
  fetchLiveMarketCapSnapshot(cleanMint, getSolPrice()).then((snapshot) => {
    if (isSubscribed && snapshot && !hasReceivedOnChain) {
      onUpdate(snapshot);
    }
  });

  // 2. Fetch on-chain raw 49-byte bonding curve buffer (< 200ms latency)
  const fetchOnChain = async () => {
    if (!isSubscribed) return;
    if (pda) {
      try {
        const accountInfo = await connection.getAccountInfo(pda, 'processed');
        if (!isSubscribed) return;
        if (accountInfo?.data && accountInfo.data.length >= 40) {
          const decoded = decodeBondingCurveData(accountInfo.data, getSolPrice());
          if (decoded && decoded.mcapInSol > 0) {
            hasReceivedOnChain = true;
            onUpdate(decoded);
            return;
          }
        }
      } catch (e) {}
    }

    // Fallback if not an active pump curve (e.g. Raydium token)
    if (!hasReceivedOnChain) {
      fetchLiveMarketCapSnapshot(cleanMint, getSolPrice()).then((snapshot) => {
        if (isSubscribed && snapshot && !hasReceivedOnChain) {
          onUpdate(snapshot);
        }
      });
    }
  };

  fetchOnChain();

  let subId = null;
  let pollInterval = null;

  // 3. Real-time sub-second WebSocket listener (Only if dedicated WS is available)
  if (pda) {
    if (hasDedicatedWs) {
      try {
        subId = connection.onAccountChange(
          pda,
          (accountInfo) => {
            if (!isSubscribed) return;
            if (accountInfo?.data) {
              const decoded = decodeBondingCurveData(accountInfo.data, getSolPrice());
              if (decoded) {
                onUpdate(decoded);
              }
            }
          },
          'processed'
        );
      } catch (e) {}
    }

    // Passive heartbeat sync polling (every 15s)
    pollInterval = setInterval(fetchOnChain, 15000);
  }

  return () => {
    isSubscribed = false;
    if (pollInterval) clearInterval(pollInterval);
    if (subId !== null) {
      try {
        connection.removeAccountChangeListener(subId);
      } catch (e) {}
    }
  };
}

/**
 * Real-Time Trade Stream Subscription
 * High-performance WebSocket stream via PumpPortal (< 100ms latency, zero RPC load)
 */
export function subscribeRealtimeTrades(connection, mintAddress, onTrade, getSolPrice = () => 155) {
  if (!mintAddress || !isValidPublicKey(mintAddress)) return () => {};

  const cleanMint = mintAddress.trim();
  let isClosed = false;
  let ws = null;

  const connectWs = () => {
    if (isClosed) return;
    try {
      ws = new WebSocket('wss://pumpportal.fun/api/data');

      ws.onopen = () => {
        const payload = {
          method: 'subscribeTokenTrade',
          keys: [cleanMint],
        };
        ws.send(JSON.stringify(payload));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && (data.mint === cleanMint || data.traderPublicKey)) {
            onTrade(data);
          }
        } catch (e) {}
      };

      ws.onerror = () => {};
      ws.onclose = () => {
        if (!isClosed) setTimeout(connectWs, 4000);
      };
    } catch (e) {}
  };

  connectWs();

  return () => {
    isClosed = true;
    if (ws) {
      try {
        ws.close();
      } catch (e) {}
    }
  };
}

// In-Memory Holders Cache with 45s TTL to eliminate redundant RPC bursts
const holdersCache = new Map();

/**
 * 3-Step Buyer & Resident Discovery Pipeline:
 * Step 1: Query On-Chain Token Accounts (getTokenLargestAccounts)
 * Step 2: Strict Liquidity Pool & Bot Exclusion (exclude PDA, ATA, and balances >= 150M tokens)
 * Step 3: Resolve Real Wallet Owners by reading bytes 32..64 of SPL token account data in batch
 */
export async function fetchHolders(connection, mintAddress, minSolThreshold = 0.05, currentMcapInSol = 30) {
  if (!mintAddress || !isValidPublicKey(mintAddress)) return [];
  const cleanMint = mintAddress.trim();

  const cacheKey = `${cleanMint}-${currentMcapInSol.toFixed(1)}`;
  const cached = holdersCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 45000) {
    return cached.data;
  }

  try {
    const mintPubkey = new PublicKey(cleanMint);
    const pda = getBondingCurvePDA(cleanMint);
    const pdaStr = pda ? pda.toBase58() : '';

    // Step 1: Query largest token accounts
    const largestAccounts = await connection.getTokenLargestAccounts(mintPubkey);
    const tokenAccounts = largestAccounts?.value || [];
    if (tokenAccounts.length === 0) return [];

    // Step 2: Filter out 0 balance accounts, liquidity pool reserves (>= 150M tokens), and known programs
    const candidateAccounts = [];
    const totalSupply = 1_000_000_000;

    for (const acc of tokenAccounts) {
      if (!acc?.address) continue;
      const tokenAddressStr = acc.address.toBase58 ? acc.address.toBase58() : String(acc.address);

      if (tokenAddressStr === pdaStr || KNOWN_POOL_ADDRESSES.has(tokenAddressStr)) continue;

      const tokenAmount = Number(acc.uiAmount) || 0;
      // Skip 0-balance closed/empty accounts and liquidity pool reserves (>= 150,000,000 tokens)
      if (tokenAmount <= 0 || tokenAmount >= 150_000_000) continue;

      candidateAccounts.push({
        tokenAccountPubkey: acc.address,
        tokenAddressStr,
        tokenAmount,
        percentage: (tokenAmount / totalSupply) * 100,
        solValue: (tokenAmount / totalSupply) * currentMcapInSol,
      });
    }

    if (candidateAccounts.length === 0) return [];

    // Step 3: Resolve Real Wallet Owners via batch getMultipleAccountsInfo
    const accountPubkeys = candidateAccounts.map((c) => c.tokenAccountPubkey);
    const accountsInfo = await connection.getMultipleAccountsInfo(accountPubkeys, 'confirmed');

    const holders = [];
    const seenOwners = new Set();

    for (let i = 0; i < candidateAccounts.length; i++) {
      const candidate = candidateAccounts[i];
      const accInfo = accountsInfo?.[i];

      let ownerPubkeyStr = candidate.tokenAddressStr;

      // Extract real wallet owner from SPL Token Account data (Bytes 32..64)
      if (accInfo?.data && accInfo.data.length >= 64) {
        try {
          const ownerBytes = accInfo.data.subarray(32, 64);
          ownerPubkeyStr = new PublicKey(ownerBytes).toBase58();
        } catch (e) {}
      }

      // Check if owner is a known program, bonding curve PDA, or already added
      if (
        KNOWN_POOL_ADDRESSES.has(ownerPubkeyStr) ||
        ownerPubkeyStr === pdaStr ||
        seenOwners.has(ownerPubkeyStr) ||
        candidate.tokenAmount <= 0 ||
        candidate.percentage <= 0
      ) {
        continue;
      }

      seenOwners.add(ownerPubkeyStr);

      holders.push({
        id: `holder-${ownerPubkeyStr}`,
        address: `${ownerPubkeyStr.slice(0, 4)}...${ownerPubkeyStr.slice(-4)}`,
        fullAddress: ownerPubkeyStr,
        holdingAmount: candidate.tokenAmount,
        percentage: Number(candidate.percentage.toFixed(3)),
        solValue: Number(candidate.solValue.toFixed(4)),
        tier: holders.length === 0 ? '👑 WHALE KING' : holders.length < 3 ? '🌟 GIGA CHAD' : holders.length < 6 ? '💎 DIAMOND' : '🍆 CHAD',
      });
    }

    if (holders.length > 0) {
      holdersCache.set(cacheKey, { timestamp: Date.now(), data: holders });
    }

    return holders;
  } catch (err) {
    if (cached) return cached.data;
    return [];
  }
}

// Alias for backward compatibility
export const fetchTopHolders = fetchHolders;
