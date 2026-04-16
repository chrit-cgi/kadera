/**
 * VDOT implementation based on Jack Daniels' Running Formula.
 *
 * VDOT is a measure of running economy/fitness derived from a recent race
 * result. It allows pace targets for different training zones to be computed.
 *
 * Reference: Daniels, J. (2014). Daniels' Running Formula, 3rd ed.
 */

// ── VDOT derivation ───────────────────────────────────────────────────────────

/**
 * Derive VDOT from a race result.
 *
 * Uses the Daniels/Gilbert formula:
 *   VO2 = -4.60 + 0.182258 * velocity + 0.000104 * velocity^2
 *   %VO2max = 0.8 + 0.1894393 * e^(-0.012778 * time) + 0.2989558 * e^(-0.1932605 * time)
 *   VDOT = VO2 / %VO2max
 *
 * @param distanceKm - Race distance in kilometres
 * @param timeSeconds - Finish time in seconds
 * @returns VDOT value (typically 30–85 for recreational–elite runners)
 */
export function deriveVdot(distanceKm: number, timeSeconds: number): number {
  if (distanceKm <= 0 || timeSeconds <= 0) {
    throw new Error('Distance and time must be positive')
  }

  const timeMin = timeSeconds / 60
  const distanceM = distanceKm * 1000

  // Velocity in metres per minute
  const velocity = distanceM / timeMin

  // VO2 required for this pace
  const vo2 =
    -4.60 +
    0.182258 * velocity +
    0.000104 * velocity * velocity

  // Fraction of VO2max sustainable at this pace for this duration
  const pctVO2max =
    0.8 +
    0.1894393 * Math.exp(-0.012778 * timeMin) +
    0.2989558 * Math.exp(-0.1932605 * timeMin)

  const vdot = vo2 / pctVO2max
  return Math.round(vdot * 10) / 10 // 1 decimal place
}

// ── Training pace zones ───────────────────────────────────────────────────────

export type PaceZone = 'easy' | 'marathon' | 'threshold' | 'interval' | 'repetition'

/**
 * Return target pace in seconds/km for a given VDOT and training zone.
 *
 * Pace ranges are the midpoints of Daniels' recommended ranges.
 * Higher VDOT → faster paces.
 */
export function getPaceForZone(vdot: number, zone: PaceZone): number {
  // vdot40 ↔ vdot80 mapped linearly for each zone (seconds/km)
  // Values approximate Daniels' VDOT tables at vdot=40 and vdot=80
  const zones: Record<PaceZone, [v40: number, v80: number]> = {
    easy: [390, 255],      // 6:30/km → 4:15/km
    marathon: [365, 225],  // 6:05/km → 3:45/km
    threshold: [335, 200], // 5:35/km → 3:20/km
    interval: [305, 175],  // 5:05/km → 2:55/km
    repetition: [280, 155], // 4:40/km → 2:35/km
  }

  const [v40, v80] = zones[zone]
  // Linear interpolation between vdot=40 and vdot=80
  const clamped = Math.max(30, Math.min(85, vdot))
  const t = (clamped - 40) / (80 - 40)
  const pace = v40 + t * (v80 - v40)

  return Math.round(pace)
}

/**
 * Compute HR zones from max heart rate.
 * Returns [minBPM, maxBPM] for zones 1–5.
 */
export function getHRZones(maxHR: number): Array<[number, number]> {
  return [
    [Math.round(maxHR * 0.50), Math.round(maxHR * 0.60)], // Z1 Easy
    [Math.round(maxHR * 0.60), Math.round(maxHR * 0.70)], // Z2 Aerobic
    [Math.round(maxHR * 0.70), Math.round(maxHR * 0.80)], // Z3 Tempo
    [Math.round(maxHR * 0.80), Math.round(maxHR * 0.90)], // Z4 Threshold
    [Math.round(maxHR * 0.90), maxHR],                     // Z5 VO2max
  ]
}
