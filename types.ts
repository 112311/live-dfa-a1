export interface RRInterval {
  timestamp: number; // Relative time in ms or absolute
  intervalMs: number;
}

export interface DFADataPoint {
  timestamp: number;
  alpha1: number;
  heartRate: number;
}

export interface BluetoothState {
  isConnected: boolean;
  isConnecting: boolean;
  deviceName: string | null;
  error: string | null;
}