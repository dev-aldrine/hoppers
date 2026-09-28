import { PublicKey } from '@solana/web3.js';

export const PUMP_PROGRAM_ID = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');

export function isValidPublicKey(address) {
  if (!address || typeof address !== 'string') return false;
  const trimmed = address.trim();
  if (trimmed.length < 32 || trimmed.length > 44) return false;
  try {
    new PublicKey(trimmed);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Derives the Pump.fun bonding curve PDA from mint address:
 * PDA = findProgramAddressSync(["bonding-curve", mintPubkey], 6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P)
 */
export function getBondingCurvePDA(mintAddress) {
  if (!isValidPublicKey(mintAddress)) return null;
  try {
    const mintPubkey = new PublicKey(mintAddress.trim());
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from('bonding-curve'), mintPubkey.toBuffer()],
      PUMP_PROGRAM_ID
    );
    return pda;
  } catch (err) {
    return null;
  }
}

/**
 * Binary buffer decoding for Pump.fun 49-byte account buffer (< 200ms latency):
 * Bytes 0–7: 8-byte Anchor discriminator
 * Bytes 8–15: virtualTokenReserves (u64, 6 decimals)
 * Bytes 16–23: virtualSolReserves (u64, 9 decimals)
 * Bytes 24–31: realTokenReserves (u64, 6 decimals)
 * Bytes 32–39: realSolReserves (u64, 9 decimals)
 * Bytes 40–47: tokenTotalSupply (u64)
 * Byte 48: complete flag (0 = active on curve, 1 = migrated to Raydium)
 */
export function decodeBondingCurveData(dataBuffer, solUsdPrice = 155) {
  if (!dataBuffer) return null;

  try {
    const u8 = dataBuffer instanceof Uint8Array ? dataBuffer : new Uint8Array(dataBuffer);
    if (u8.byteLength < 40) return null;

    const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);

    const virtualTokenReserves = Number(view.getBigUint64(8, true));
    const virtualSolReserves = Number(view.getBigUint64(16, true));
    const realTokenReserves = u8.byteLength >= 32 ? Number(view.getBigUint64(24, true)) : 0;
    const realSolReserves = u8.byteLength >= 40 ? Number(view.getBigUint64(32, true)) : 0;
    const isComplete = u8.byteLength >= 49 ? Boolean(view.getUint8(48)) : false;

    if (virtualTokenReserves === 0) return null;

    // Scale reserves
    const virtualSol = virtualSolReserves / 1e9;
    const virtualToken = virtualTokenReserves / 1e6;

    // Price per token in SOL = virtualSol / virtualToken
    const priceInSol = virtualSol / virtualToken;

    // Total Supply = 1,000,000,000 (1 Billion) tokens
    const totalSupply = 1_000_000_000;
    const mcapInSol = priceInSol * totalSupply;
    const mcapInUsd = mcapInSol * (Number(solUsdPrice) || 155);

    // Progress towards 100% Raydium migration (~85 SOL in real reserves)
    const realSol = realSolReserves / 1e9;
    const migrationProgress = isComplete ? 100 : Math.min(100, Math.max(0, (realSol / 85) * 100));

    return {
      priceInSol,
      mcapInSol,
      mcapSol: mcapInSol,
      mcapInUsd,
      mcapUsd: mcapInUsd,
      virtualSolReserves,
      virtualTokenReserves,
      realSolReserves: realSol,
      realTokenReserves: realTokenReserves / 1e6,
      migrationProgress,
      solUsdPrice: Number(solUsdPrice) || 155,
      isComplete,
    };
  } catch (e) {
    return null;
  }
}

// Alias for backward compatibility
export const decodeBondingCurveBuffer = decodeBondingCurveData;
