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
  // Basic artifact correction: Filter outliers
  // Using a simple median filter or percentage deviation approach
  if (rrIntervals.length < 3) return rrIntervals;

  const filtered: number[] = [];
  
  // First pass: Global median limits could be applied, but local is better for HRV
  // We'll use a simple deviation from moving median of 5
  
  for (let i = 0; i < rrIntervals.length; i++) {
    const val = rrIntervals[i];
    // Simple check: is it within physiological limits (300ms to 2000ms typically)
    if (val < 250 || val > 2000) continue; 
    
    // Check against neighbors if possible
    if (filtered.length > 5) {
      const last5 = filtered.slice(-5);
      const meanLocal = last5.reduce((a, b) => a + b, 0) / last5.length;
      if (Math.abs(val - meanLocal) / meanLocal > 0.3) {
        // likely artifact, skip or replace. 
        // For simplicity in this demo, we skip. 
        // In pro apps, we might interpolate.
        continue; 
      }
    }
    filtered.push(val);
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
