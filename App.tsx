import React, { useEffect, useState, useRef } from 'react';
import { Activity, Heart, Bluetooth, AlertCircle, Cpu } from 'lucide-react';
import { BluetoothMonitor } from './services/bluetoothService';
import { calculateDfaAlpha1 } from './services/dfaService';
import { HistoryChart } from './components/HistoryChart';
import { AlphaGauge } from './components/Gauge';
import { DFADataPoint, BluetoothState } from './types';
import { DFA_WINDOW_WIDTH } from './constants';

const App: React.FC = () => {
  // State
  const [btState, setBtState] = useState<BluetoothState>({
    isConnected: false,
    isConnecting: false,
    deviceName: null,
    error: null,
  });

  const [heartRate, setHeartRate] = useState<number>(0);
  const [currentAlpha1, setCurrentAlpha1] = useState<number | null>(null);
  const [history, setHistory] = useState<DFADataPoint[]>([]);

  // Refs for data processing without re-renders
  const rrBufferRef = useRef<number[]>([]);
  const monitorRef = useRef<BluetoothMonitor | null>(null);

  // Initialize Bluetooth Monitor
  useEffect(() => {
    monitorRef.current = new BluetoothMonitor(
      (hr, rrIntervals) => {
        setHeartRate(hr);

        if (rrIntervals.length > 0) {
          rrBufferRef.current = [...rrBufferRef.current, ...rrIntervals];

          // Limit buffer size to keep memory usage low, but keep enough for window
          // If we want a rolling window of calculation:
          if (rrBufferRef.current.length > DFA_WINDOW_WIDTH + 50) {
             rrBufferRef.current = rrBufferRef.current.slice(-(DFA_WINDOW_WIDTH + 50));
          }

          // Attempt calculation if we have enough data
          // We debounce this slightly in practice, but here every update is fine
          // if updates are infrequent (1s). RR packets usually come 1/sec.
          if (rrBufferRef.current.length >= DFA_WINDOW_WIDTH) {
             const windowSlice = rrBufferRef.current.slice(-DFA_WINDOW_WIDTH);
             const alpha = calculateDfaAlpha1(windowSlice);

             if (alpha !== null) {
               setCurrentAlpha1(alpha);
               setHistory(prev => {
                 // Update history at most once per second
                 const last = prev[prev.length - 1];
                 const now = Date.now();
                 if (!last || (now - last.timestamp > 2000)) {
                    return [...prev, { timestamp: now, alpha1: alpha, heartRate: hr }];
                 }
                 return prev;
               });
             }
          }
        }
      },
      (isConnected, error) => {
        setBtState(prev => ({
          ...prev,
          isConnected,
          isConnecting: false,
          error: error || null,
          deviceName: isConnected ? 'HR Monitor' : null
        }));
      }
    );

    return () => {
      monitorRef.current?.disconnect();
    };
  }, []);

  const handleConnect = () => {
    setBtState(prev => ({ ...prev, isConnecting: true, error: null }));
    monitorRef.current?.connect();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <header className="flex justify-between items-center pb-6 border-b border-slate-800">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="text-emerald-500" />
              DFA a1 Threshold Monitor
            </h1>
            <p className="text-slate-400 text-sm mt-1">Real-time aerobic threshold estimation via HRV</p>
          </div>

          <div>
            {!btState.isConnected ? (
              <button
                onClick={handleConnect}
                disabled={btState.isConnecting}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Bluetooth className="w-5 h-5" />
                {btState.isConnecting ? 'Connecting...' : 'Connect HR Monitor'}
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-lg border border-emerald-500/20">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                Connected
              </div>
            )}
          </div>
        </header>

        {/* Error Message */}
        {btState.error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            <p>{btState.error}</p>
          </div>
        )}

        {/* Main Dashboard */}
        <main className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Card: Heart Rate */}
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex flex-col items-center justify-center min-h-[200px]">
             <div className="flex items-center gap-2 text-slate-400 mb-2 uppercase text-xs font-bold tracking-wider">
               <Heart className="w-4 h-4 text-rose-500" /> Heart Rate
             </div>
             <div className="text-6xl font-bold text-slate-100 tabular-nums">
               {heartRate > 0 ? heartRate : '--'}
             </div>
             <div className="text-slate-500 text-sm mt-1">BPM</div>
          </div>

          {/* Card: Alpha 1 Gauge */}
          <div className="md:col-span-1">
             <AlphaGauge value={currentAlpha1 !== null ? currentAlpha1 : 0} />
          </div>

          {/* Card: Status / Info */}
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex flex-col justify-between">
            <div>
              <h3 className="text-slate-400 text-xs font-bold tracking-wider uppercase mb-4">Metric Info</h3>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex justify-between">
                  <span>Samples (Window):</span>
                  <span className="font-mono text-slate-100">{DFA_WINDOW_WIDTH} beats</span>
                </li>
                <li className="flex justify-between">
                  <span>AeT Target:</span>
                  <span className="font-mono text-emerald-400">0.75</span>
                </li>
                 <li className="flex justify-between">
                  <span>Current Zone:</span>
                  <span className="font-mono text-slate-100">
                    {!currentAlpha1 ? '--' : currentAlpha1 > 0.75 ? 'Aerobic' : currentAlpha1 > 0.5 ? 'Threshold' : 'Anaerobic'}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </main>

        {/* Charts Section */}
        <section className="bg-slate-800 p-6 rounded-xl border border-slate-700">
           <h3 className="text-slate-400 text-sm font-bold tracking-wider uppercase mb-6">Real-time Trends</h3>
           {history.length > 2 ? (
             <HistoryChart data={history} />
           ) : (
             <div className="h-64 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-700 rounded-lg">
                <Activity className="w-8 h-8 mb-2 opacity-50" />
                <p>Waiting for sufficient data...</p>
                <p className="text-xs mt-2">Need approx 2 mins of recording</p>
             </div>
           )}
        </section>

      </div>
    </div>
  );
};

export default App;
