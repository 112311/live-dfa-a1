export const SERVICE_HEART_RATE = 0x180D;
export const CHAR_HEART_RATE_MEASUREMENT = 0x2A37;

// DFA Calculation Constants
export const MIN_RR_BUFFER_SIZE = 120; // Minimum beats to calculate DFA
export const MAX_RR_BUFFER_SIZE = 300; // Keep a rolling window
export const DFA_WINDOW_WIDTH = 200; // Number of beats for the calculation window

export const ARTIFACT_THRESHOLD_PERCENT = 0.20; // 20% deviation threshold

// Thresholds
export const THRESHOLD_AEROBIC = 0.75; // The target for AeT
export const THRESHOLD_ANAEROBIC = 0.5; 
