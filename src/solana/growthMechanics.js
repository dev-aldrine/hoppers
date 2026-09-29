// 📏 HODL Growth & Prize Pool Game Mechanics

export const INCHES_PER_SCALE_UNIT = 4.92; // 1.0 scale = ~4.92 inches (~125 mm)
export const MM_PER_SECOND = 0; // Disabled time-based growth
export const INCHES_PER_SECOND = 0;
export const DEFAULT_PRIZE_DISTRIBUTION = [40, 25, 15, 12, 8];

/**
 * Calculates the base scale multiplier from initial SOL buy
 * Proportional curve (1.0x to max 2.8x) based on buy amount
 */
export function calculateBaseShaftScale(solAmount) {
  const sol = Math.max(0.01, Number(solAmount) || 0.1);
  const scale = 1.0 + Math.log10(1 + sol * 2.0) * 0.75;
  return Math.min(2.8, Math.max(1.0, scale));
}

/**
 * Calculates the length in inches from SOL buy amount
 */
export function calculateBaseInches(solAmount) {
  return calculateBaseShaftScale(solAmount) * INCHES_PER_SCALE_UNIT;
}

/**
 * Time growth is removed (returns 0)
 */
export function calculateHodlGrowthInches() {
  return 0;
}

/**
 * Time growth mm is removed (returns '0.0')
 */
export function calculateHodlGrowthMm() {
  return '0.0';
}

/**
 * Calculates total shaft length in inches based on buy amount
 */
export function calculateTotalInches(solAmount) {
  return calculateBaseInches(solAmount);
}

/**
 * Converts total inches back to 3D mesh Y-axis scale factor
 */
export function calculateTotalShaftScale(totalInches) {
  return Math.min(2.8, Math.max(1.0, (Number(totalInches) || INCHES_PER_SCALE_UNIT) / INCHES_PER_SCALE_UNIT));
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
