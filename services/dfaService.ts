/**
 * Detrended Fluctuation Analysis (DFA) Alpha 1 implementation
 * Specialized for short-term scaling exponent (alpha 1) of HRV data.
 */

// Simple linear regression to find slope
const linearRegression = (x: number[], y: number[]) => {
  const n = x.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumXX += x[i] * x[i];
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
};

// Calculate RMS fluctuation for a given box size
const calculateF_n = (integratedSeries: number[], boxSize: number): number => {
  const N = integratedSeries.length;
  const numBoxes = Math.floor(N / boxSize);
  let totalResidualSq = 0;

  for (let i = 0; i < numBoxes; i++) {
    const start = i * boxSize;
    const end = start + boxSize;
    const segmentY = integratedSeries.slice(start, end);
    const segmentX = Array.from({ length: boxSize }, (_, k) => k); // 0, 1, ... boxSize-1

    // Detrend: Linear fit
    const { slope, intercept } = linearRegression(segmentX, segmentY);

    // Calculate residuals
    for (let k = 0; k < boxSize; k++) {
      const trend = slope * k + intercept;
      const residual = segmentY[k] - trend;
      totalResidualSq += residual * residual;
    }
  }

  // F(n) = sqrt(1/N * sum(residuals^2))
  // Standard definition typically divides by N (total length) or numBoxes * boxSize
  return Math.sqrt(totalResidualSq / (numBoxes * boxSize));
};

export const preprocessRR = (rrIntervals: number[]): number[] => {
  // 1. Safety Checks
  if (!rrIntervals || rrIntervals.length < 3) return rrIntervals || [];

  const filtered: number[] = [];

  // Physiological Limits (in ms)
  // 300ms = 200bpm (High limit)
  // 1300ms = ~46bpm (Low limit - 2000ms is usually too loose for auto-detection)
  const MIN_RR = 300;
  const MAX_RR = 1300;

  for (let i = 0; i < rrIntervals.length; i++) {
    const val = rrIntervals[i];
    let isValid = true;

    // 2. Absolute Range Check
    if (val < MIN_RR || val > MAX_RR) {
      isValid = false;
    }

    // 3. Relative Check (The "Quotient Filter")
    // Compare current beat to the LAST ACCEPTED beat.
    // A 30% jump between beats is physiologically impossible during normal rhythm.
    if (isValid && filtered.length > 0) {
      const prev = filtered[filtered.length - 1];
      const diff = Math.abs(val - prev);
      const percentChange = diff / prev;

      if (percentChange > 0.3) {
        isValid = false;
      }
    }

    // 4. Handling: Accept or Interpolate
    if (isValid) {
      filtered.push(val);
    } else {
      // ARTIFACT CORRECTION STRATEGY: Linear Interpolation
      // We do not 'continue' (skip), because that deletes time.
      // We replace the bad value to keep the timeline intact.

      const prev = filtered.length > 0 ? filtered[filtered.length - 1] : null;
      const next = (i + 1 < rrIntervals.length) ? rrIntervals[i + 1] : null;

      if (prev && next) {
        // Best case: Average the previous valid beat and the next raw beat
        const interpolated = (prev + next) / 2;
        filtered.push(interpolated);
      } else if (prev) {
        // Edge case (End of array): Clamp to previous value
        filtered.push(prev);
      }
      // Edge case (Start of array): If index 0 is bad, we skip it.
    }
  }

  return filtered;
};

export const calculateDfaAlpha1 = (rrIntervals: number[]): number | null => {
  // 1. Preprocess
  const cleanRR = preprocessRR(rrIntervals);

  // Need minimum data points
  if (cleanRR.length < 50) return null;

  // 2. Integrate the series: y(k) = sum(rr[i] - meanRR)
  const meanRR = cleanRR.reduce((a, b) => a + b, 0) / cleanRR.length;
  const integratedSeries: number[] = [];
  let currentSum = 0;
  for (const rr of cleanRR) {
    currentSum += (rr - meanRR);
    integratedSeries.push(currentSum);
  }

  // 3. Calculate F(n) for different box sizes
  // For Alpha 1 (short term), typical range is n = 4 to 16
  const boxSizes = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
  const logN: number[] = [];
  const logFn: number[] = [];

  for (const n of boxSizes) {
    const Fn = calculateF_n(integratedSeries, n);
    if (Fn > 0) {
      logN.push(Math.log10(n));
      logFn.push(Math.log10(Fn));
    }
  }

  // 4. Slope of log(F(n)) vs log(n) is alpha 1
  const { slope } = linearRegression(logN, logFn);

  return slope;
};
