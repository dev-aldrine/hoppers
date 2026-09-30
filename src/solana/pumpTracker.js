import { PublicKey } from '@solana/web3.js';
import { getBondingCurvePDA, decodeBondingCurveData, isValidPublicKey } from './bondingCurve.js';
import {
  isValidHeliusApiKey,
  DEFAULT_HELIUS_API_KEY,
  createFallbackConnection,
  markHeliusRateLimited,
  isHeliusRateLimited,
} from './heliusConnection.js';

let cachedFallbackConn = null;
function getFallback() {
  if (!cachedFallbackConn) cachedFallbackConn = createFallbackConnection();
  return cachedFallbackConn;
}

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
 * Calculates Creator Reward Fees based on Pump.fun Bonding Curve specifications
 * Bonding Curve Phase: Flat 0.30% (0.0030) of total trading volume
 */
export function calculateCreatorRewardFees(volumeUsd = 0, volumeSol = 0, solUsdPrice = 119.5) {
  const effectiveSolPrice = Number(solUsdPrice) || 119.5;
  let totalVolSol = Number(volumeSol) || 0;
  let totalVolUsd = Number(volumeUsd) || 0;

  if (totalVolUsd > 0 && totalVolSol === 0) {
    totalVolSol = totalVolUsd / effectiveSolPrice;
  } else if (totalVolSol > 0 && totalVolUsd === 0) {
    totalVolUsd = totalVolSol * effectiveSolPrice;
  }

  // 0.30% (0.003) flat fee for Pump.fun bonding curve trading volume
  const CREATOR_FEE_RATE = 0.0030;
  const creatorFeesSol = totalVolSol * CREATOR_FEE_RATE;
  const creatorFeesUsd = totalVolUsd * CREATOR_FEE_RATE;

  return {
    feeRatePct: 0.30,
    totalVolumeSol: Number(totalVolSol.toFixed(3)),
    totalVolumeUsd: Number(totalVolUsd.toFixed(2)),
    creatorFeesSol: Number(creatorFeesSol.toFixed(4)),
    creatorFeesUsd: Number(creatorFeesUsd.toFixed(2)),
  };
}

/**
 * Fetches token snapshot from public DEX APIs (DexScreener / Pump) for immediate instant market cap & 0.30% creator fees
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

        const totalVolumeUsd = Number(pair.volume?.h24 || pair.volume?.h6 || pair.volume?.h1 || 0);
        const totalVolumeSol = totalVolumeUsd / currentSolPrice;
        
        // 0.30% Creator fee on Pump.fun bonding curve
        const CREATOR_FEE_RATE = 0.0030;
        const creatorFeesUsd = totalVolumeUsd * CREATOR_FEE_RATE;
        const creatorFeesSol = totalVolumeSol * CREATOR_FEE_RATE;

        if (mcapUsd > 0 || totalVolumeUsd > 0) {
          return {
            priceInSol,
            mcapInSol,
            mcapSol: mcapInSol,
            mcapInUsd: mcapUsd,
            mcapUsd,
            totalVolumeUsd: Number(totalVolumeUsd.toFixed(2)),
            totalVolumeSol: Number(totalVolumeSol.toFixed(3)),
            creatorFeesSol: Number(creatorFeesSol.toFixed(4)),
            creatorFeesUsd: Number(creatorFeesUsd.toFixed(2)),
            creatorFeeRate: 0.0030,
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
        let accountInfo = null;
        try {
          const activeConn = isHeliusRateLimited() ? getFallback() : connection;
          accountInfo = await activeConn.getAccountInfo(pda, 'processed');
        } catch (rpcErr) {
          if (String(rpcErr).includes('429') || String(rpcErr).includes('Too Many')) {
            markHeliusRateLimited(30000);
            accountInfo = await getFallback().getAccountInfo(pda, 'processed');
          }
        }
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
  let logsSubId = null;

  // 1. High-performance PumpPortal WebSocket stream (< 100ms latency, zero RPC load)
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
        if (!isClosed) setTimeout(connectWs, 5000);
      };
    } catch (e) {}
  };

  connectWs();

  return () => {
    isClosed = true;
    if (logsSubId !== null && connection) {
      try {
        connection.removeOnLogsListener(logsSubId);
      } catch (e) {}
    }
    if (ws) {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        } else if (ws.readyState === WebSocket.CONNECTING) {
          ws.onopen = () => {
            try { ws.close(); } catch (e) {}
          };
        }
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

    // Step 1: Query largest token accounts with fallback
    let largestAccounts = null;
    const activeConn = isHeliusRateLimited() ? getFallback() : connection;
    try {
      largestAccounts = await activeConn.getTokenLargestAccounts(mintPubkey);
    } catch (rpcErr) {
      if (String(rpcErr).includes('429') || String(rpcErr).includes('Too Many')) {
        markHeliusRateLimited(30000);
        largestAccounts = await getFallback().getTokenLargestAccounts(mintPubkey);
      }
    }
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
    let accountsInfo = null;
    try {
      const queryConn = isHeliusRateLimited() ? getFallback() : activeConn;
      accountsInfo = await queryConn.getMultipleAccountsInfo(accountPubkeys, 'confirmed');
    } catch (rpcErr) {
      if (String(rpcErr).includes('429') || String(rpcErr).includes('Too Many')) {
        markHeliusRateLimited(30000);
        accountsInfo = await getFallback().getMultipleAccountsInfo(accountPubkeys, 'confirmed');
      }
    }

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

// Centralized Enhanced Transactions Cache with request deduplication & 429 backoff
const txCache = new Map(); // mint -> { timestamp, data, inFlightPromise, rateLimitedUntil }

async function fetchCachedEnhancedTransactions(mintAddress, apiKey) {
  if (!mintAddress || !isValidPublicKey(mintAddress)) return [];
  const cleanMint = mintAddress.trim();
  const effectiveApiKey = (apiKey && isValidHeliusApiKey(apiKey)) ? apiKey.trim() : DEFAULT_HELIUS_API_KEY;
  if (!effectiveApiKey) return [];

  const now = Date.now();
  const cacheEntry = txCache.get(cleanMint);

  // If rate-limited (429), respect cooldown (12s)
  if (cacheEntry?.rateLimitedUntil && now < cacheEntry.rateLimitedUntil) {
    return cacheEntry.data || [];
  }

  // Return cached result if fresh (< 4000ms)
  if (cacheEntry?.data && now - cacheEntry.timestamp < 4000) {
    return cacheEntry.data;
  }

  // If a request is already in flight, reuse its promise
  if (cacheEntry?.inFlightPromise) {
    return cacheEntry.inFlightPromise;
  }

  const fetchPromise = (async () => {
    try {
      const url = `https://api.helius.xyz/v0/addresses/${cleanMint}/transactions?api-key=${effectiveApiKey}`;
      const res = await fetch(url);
      if (res.status === 429) {
        // Cooldown for 15 seconds on 429 to avoid hammering endpoint
        txCache.set(cleanMint, {
          timestamp: now,
          data: cacheEntry?.data || [],
          inFlightPromise: null,
          rateLimitedUntil: now + 15000,
        });
        return cacheEntry?.data || [];
      }
      if (res.ok) {
        const txs = await res.json();
        const validTxs = Array.isArray(txs) ? txs : [];
        txCache.set(cleanMint, {
          timestamp: Date.now(),
          data: validTxs,
          inFlightPromise: null,
          rateLimitedUntil: 0,
        });
        return validTxs;
      }
    } catch (e) {
      // Silently catch network failures
    } finally {
      const entry = txCache.get(cleanMint);
      if (entry) entry.inFlightPromise = null;
    }
    return cacheEntry?.data || [];
  })();

  txCache.set(cleanMint, {
    timestamp: cacheEntry?.timestamp || 0,
    data: cacheEntry?.data || [],
    inFlightPromise: fetchPromise,
    rateLimitedUntil: cacheEntry?.rateLimitedUntil || 0,
  });

  return fetchPromise;
}

const lastBuyerCache = new Map();

/**
 * Fetches the legitimate last on-chain buyer for this token who bought >= minSol (default 0.25 SOL)
 * Multi-layer pipeline: Helius Enhanced Transactions -> Solana RPC Parsed Signatures -> PumpPortal
 */
export async function fetchLastQualifiedBuyer(connection, mintAddress, minSol = 0.25, apiKey = null) {
  if (!mintAddress || !isValidPublicKey(mintAddress)) return null;
  const cleanMint = mintAddress.trim();

  // Return cached qualified buyer if queried in last 4.5 seconds
  const cachedBuyer = lastBuyerCache.get(cleanMint);
  if (cachedBuyer && Date.now() - cachedBuyer.timestamp < 4500) {
    return cachedBuyer.data;
  }

  const resolveBuyer = (buyer) => {
    lastBuyerCache.set(cleanMint, { timestamp: Date.now(), data: buyer });
    return buyer;
  };

  // 1. High-Performance Helius Enhanced Transaction Parser (Cached & Rate-Limit Proof)
  try {
    const txs = await fetchCachedEnhancedTransactions(cleanMint, apiKey);
    if (Array.isArray(txs) && txs.length > 0) {
      for (const tx of txs) {
        const tokenTransfers = tx.tokenTransfers || [];
        const feePayer = tx.feePayer;

        // Find if tokens of this mint were received by a legitimate user wallet
        const tokenTransfer = tokenTransfers.find(
          (tt) =>
            tt.mint === cleanMint &&
            tt.tokenAmount > 0 &&
            tt.toUserAccount &&
            !KNOWN_POOL_ADDRESSES.has(tt.toUserAccount)
        );

        if (tokenTransfer) {
          const buyerWallet = tokenTransfer.toUserAccount || feePayer;

          // Calculate net SOL spent by the buyer
          let solSpent = 0;
          if (tx.accountData) {
            const buyerAcc = tx.accountData.find(
              (a) => a.account === buyerWallet || a.account === feePayer
            );
            if (buyerAcc && buyerAcc.nativeBalanceChange < 0) {
              solSpent = Math.abs(buyerAcc.nativeBalanceChange) / 1e9;
            }
          }

          if (solSpent === 0 && tx.nativeTransfers) {
            const spentTransfers = tx.nativeTransfers.filter(
              (nt) => nt.fromUserAccount === buyerWallet || nt.fromUserAccount === feePayer
            );
            const receivedTransfers = tx.nativeTransfers.filter(
              (nt) => nt.toUserAccount === buyerWallet || nt.toUserAccount === feePayer
            );
            const totalOut = spentTransfers.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
            const totalIn = receivedTransfers.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
            if (totalOut > totalIn) {
              solSpent = (totalOut - totalIn) / 1e9;
            }
          }

          if (solSpent >= minSol && buyerWallet && !KNOWN_POOL_ADDRESSES.has(buyerWallet)) {
            return resolveBuyer({
              wallet: buyerWallet,
              buyAmountSol: Number(solSpent.toFixed(3)),
              timestamp: tx.timestamp ? tx.timestamp * 1000 : Date.now(),
              signature: tx.signature,
            });
          }
        }
      }
    }
  } catch (e) {}

  // 2. Query on-chain parsed transactions from Solana RPC with v0 & v1 fallback and auto-failover
  if (connection) {
    try {
      const activeConn = isHeliusRateLimited() ? getFallback() : connection;
      const pda = getBondingCurvePDA(cleanMint);
      const targetPubkey = pda || new PublicKey(cleanMint);
      let sigs = null;
      try {
        sigs = await activeConn.getSignaturesForAddress(targetPubkey, { limit: 10 });
      } catch (rpcErr) {
        if (String(rpcErr).includes('429') || String(rpcErr).includes('Too Many')) {
          markHeliusRateLimited(30000);
          sigs = await getFallback().getSignaturesForAddress(targetPubkey, { limit: 10 });
        }
      }
      
      if (sigs && sigs.length > 0) {
        const sigList = sigs.slice(0, 6).map((s) => s.signature);
        let txs = null;
        const queryConn = isHeliusRateLimited() ? getFallback() : activeConn;
        try {
          txs = await queryConn.getParsedTransactions(sigList, { maxSupportedTransactionVersion: 0 });
        } catch (err0) {
          try {
            txs = await queryConn.getParsedTransactions(sigList, { maxSupportedTransactionVersion: 1 });
          } catch (err1) {
            try {
              txs = await getFallback().getParsedTransactions(sigList, { maxSupportedTransactionVersion: 0 });
            } catch (err2) {}
          }
        }

        if (Array.isArray(txs)) {
          for (const tx of txs) {
            if (!tx || !tx.meta || tx.meta.err) continue;
            const accountKeys = tx.transaction.message.accountKeys;
            const feePayer = accountKeys[0]?.pubkey?.toBase58();
            const preBal = tx.meta.preBalances[0];
            const postBal = tx.meta.postBalances[0];
            const solSpent = (preBal - postBal) / 1e9;

            if (solSpent >= minSol && feePayer && !KNOWN_POOL_ADDRESSES.has(feePayer)) {
              return resolveBuyer({
                wallet: feePayer,
                buyAmountSol: Number(solSpent.toFixed(3)),
                timestamp: tx.blockTime ? tx.blockTime * 1000 : Date.now(),
                signature: tx.transaction.signatures[0],
              });
            }
          }
        }
      }
    } catch (e) {}
  }

  return resolveBuyer(null);
}

/**
 * Fetches recent on-chain transactions for the token to seed the Transaction Leaderboard
 */
export async function fetchRecentTrades(connection, mintAddress, apiKey = null, solPrice = 119.5) {
  if (!mintAddress || !isValidPublicKey(mintAddress)) return [];
  const cleanMint = mintAddress.trim();

  try {
    const txs = await fetchCachedEnhancedTransactions(cleanMint, apiKey);
    if (Array.isArray(txs)) {
      const trades = [];
      for (const tx of txs) {
        const tokenTransfers = tx.tokenTransfers || [];
        const feePayer = tx.feePayer;

        const tokenTransfer = tokenTransfers.find((tt) => tt.mint === cleanMint);
        if (!tokenTransfer) continue;

        const isBuy =
          tokenTransfer.toUserAccount === feePayer ||
          (tokenTransfer.toUserAccount && !tokenTransfer.toUserAccount.startsWith('6EF8'));
        const buyerWallet = tokenTransfer.toUserAccount || feePayer;
        const sellerWallet = tokenTransfer.fromUserAccount || feePayer;
        const targetWallet = isBuy ? buyerWallet : sellerWallet;

        let solAmount = 0;
        if (tx.accountData) {
          const userAcc = tx.accountData.find(
            (a) => a.account === targetWallet || a.account === feePayer
          );
          if (userAcc && userAcc.nativeBalanceChange) {
            solAmount = Math.abs(userAcc.nativeBalanceChange) / 1e9;
          }
        }

        if (solAmount === 0 && tx.nativeTransfers) {
          const spent = tx.nativeTransfers.filter(
            (n) => n.fromUserAccount === targetWallet || n.fromUserAccount === feePayer
          );
          solAmount = spent.reduce((s, t) => s + (Number(t.amount) || 0), 0) / 1e9;
        }

        if (solAmount > 0 && targetWallet && !KNOWN_POOL_ADDRESSES.has(targetWallet)) {
          trades.push({
            id: `tx-${tx.signature || Math.random().toString(36).substring(2, 6)}`,
            wallet: `${targetWallet.slice(0, 4)}...${targetWallet.slice(-4)}`,
            fullWallet: targetWallet,
            solAmount: Number(solAmount.toFixed(3)),
            usdValue: (solAmount * solPrice).toLocaleString(undefined, { maximumFractionDigits: 0 }),
            txType: isBuy ? 'buy' : 'sell',
            timestamp: tx.timestamp ? tx.timestamp * 1000 : Date.now(),
            signature: tx.signature,
          });
        }
      }
      return trades;
    }
  } catch (e) {}

  return [];
}

