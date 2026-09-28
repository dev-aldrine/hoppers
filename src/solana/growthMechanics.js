// 📏 HODL Growth & Prize Pool Game Mechanics

export const INCHES_PER_SCALE_UNIT = 4.92; // 1.0 scale = ~4.92 inches (~125 mm)
export const MM_PER_SECOND = 0.05; // 🎯 1 second of holding = +0.05 mm (+3.0 mm/min)
export const INCHES_PER_SECOND = MM_PER_SECOND / 25.4;
export const DEFAULT_PRIZE_DISTRIBUTION = [40, 25, 15, 12, 8]; // Percentages for 1st to 5th place

/**
 * Calculates the base scale multiplier from initial SOL buy
 * Gentle proportional curve (1.0x to max 2.8x) so hoppers are never ridiculously tall
 */
export function calculateBaseShaftScale(solAmount) {
  const sol = Math.max(0.01, Number(solAmount) || 0.1);
  const scale = 1.0 + Math.log10(1 + sol * 2.0) * 0.75;
  return Math.min(2.8, Math.max(1.0, scale));
}

/**
 * Calculates the base length in inches from initial SOL buy
 */
export function calculateBaseInches(solAmount) {
  return calculateBaseShaftScale(solAmount) * INCHES_PER_SCALE_UNIT;
}

/**
 * Calculates bonus inches earned by holding over time (+0.05 mm per second)
 */
export function calculateHodlGrowthInches(spawnTimestamp, mmPerSecond = MM_PER_SECOND, bonusMinutes = 0) {
  const now = Date.now();
  const spawnTime = spawnTimestamp || now;
  const elapsedSeconds = Math.max(0, (now - spawnTime) / 1000) + Math.max(0, (Number(bonusMinutes) || 0) * 60);
  const growthInMm = elapsedSeconds * (Number(mmPerSecond) || MM_PER_SECOND);
  return growthInMm / 25.4; // Convert mm to inches
}

/**
 * Calculates bonus mm earned by holding over time (+0.05 mm per second)
 */
export function calculateHodlGrowthMm(spawnTimestamp, mmPerSecond = MM_PER_SECOND, bonusMinutes = 0) {
  const now = Date.now();
  const spawnTime = spawnTimestamp || now;
  const elapsedSeconds = Math.max(0, (now - spawnTime) / 1000) + Math.max(0, (Number(bonusMinutes) || 0) * 60);
  return (elapsedSeconds * (Number(mmPerSecond) || MM_PER_SECOND)).toFixed(1);
}

/**
 * Calculates total current shaft length in inches (Base + HODL Growth at +0.05 mm/sec)
 */
export function calculateTotalInches(solAmount, spawnTimestamp, mmPerSecond = MM_PER_SECOND, bonusMinutes = 0) {
  const base = calculateBaseInches(solAmount);
  const hodl = calculateHodlGrowthInches(spawnTimestamp, mmPerSecond, bonusMinutes);
  return base + hodl;
}

/**
 * Converts total inches back to 3D mesh Y-axis scale factor (Clean clamp max 2.8x)
 */
export function calculateTotalShaftScale(totalInches) {
  return Math.min(2.8, Math.max(1.0, totalInches / INCHES_PER_SCALE_UNIT));
}

/**
 * Converts inches to millimeters (e.g. 145.2 mm)
 */
export function inchesToMm(inches) {
  return (Number(inches) * 25.4).toFixed(1);
}

/**
 * Converts inches to centimeters (e.g. 14.52 cm)
 */
export function inchesToCm(inches) {
  return (Number(inches) * 2.54).toFixed(2);
}

/**
 * Formats inches with quote symbol (e.g. 5.7")
 */
export function formatInches(inches) {
  return `${Number(inches || 0).toFixed(1)}"`;
}

/**
 * Formats mm string (e.g. 145.2 mm)
 */
export function formatMm(inches) {
  return `${inchesToMm(inches)} mm`;
}

/**
 * Formats holding duration into human readable string (e.g. "4m 12s")
 */
export function formatHodlDuration(spawnTimestamp, bonusMinutes = 0) {
  const now = Date.now();
  const spawnTime = spawnTimestamp || now;
  const elapsedSec = Math.floor(Math.max(0, now - spawnTime) / 1000) + Math.floor((Number(bonusMinutes) || 0) * 60);
  
  if (elapsedSec < 60) return `${elapsedSec}s`;
  const mins = Math.floor(elapsedSec / 60);
  const secs = elapsedSec % 60;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hrs}h ${remMins}m`;
}

/**
 * Calculate prize payout for a given rank (1-5)
 */
export function calculatePrizePayout(prizePoolSol, rank, distribution = DEFAULT_PRIZE_DISTRIBUTION) {
  const dist = Array.isArray(distribution) && distribution.length === 5 ? distribution : DEFAULT_PRIZE_DISTRIBUTION;
  const pct = dist[rank - 1] || 0;
  const sol = (Number(prizePoolSol || 0) * pct) / 100;
  return {
    percentage: pct,
    solAmount: sol.toFixed(2),
  };
}
