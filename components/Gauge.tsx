import React from 'react';
import { THRESHOLD_AEROBIC, THRESHOLD_ANAEROBIC } from '../constants';

interface Props {
  value: number;
}

export const AlphaGauge: React.FC<Props> = ({ value }) => {
  // Map value 0-1.5 to rotation -90 to 90
  const clamped = Math.max(0, Math.min(1.5, value));
  const percent = (clamped / 1.5) * 100;
  
  let colorClass = "text-emerald-400";
  let statusText = "Aerobic Base";
  
  if (value < THRESHOLD_AEROBIC + 0.1 && value > THRESHOLD_AEROBIC - 0.1) {
    colorClass = "text-yellow-400";
    statusText = "At Threshold";
  } else if (value < THRESHOLD_ANAEROBIC) {
    colorClass = "text-rose-500";
    statusText = "Anaerobic";
  } else if (value < THRESHOLD_AEROBIC) {
    colorClass = "text-orange-400";
    statusText = "Grey Zone";
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-slate-800 rounded-xl border border-slate-700">
      <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">DFA Alpha 1</h3>
      
      <div className="relative w-32 h-16 overflow-hidden mb-2">
         {/* Background Arc */}
         <div className="absolute top-0 left-0 w-32 h-32 rounded-full border-[12px] border-slate-700 box-border"></div>
         {/* Colored Zones (Simplified visualization using gradient or just pointer logic for now) */}
         
         {/* Needle */}
         <div 
            className="absolute top-full left-1/2 w-1 h-14 bg-white origin-top -translate-x-1/2 transition-transform duration-500 ease-out"
            style={{ 
                transform: `translateX(-50%) rotate(${(percent * 1.8) - 90 + 180}deg)`,
                transformOrigin: "top center"
            }}
         ></div>
      </div>
      
      <div className={`text-4xl font-bold ${colorClass}`}>
        {value.toFixed(2)}
      </div>
      <div className={`text-sm font-medium ${colorClass} mt-1`}>
        {statusText}
      </div>
      <div className="mt-4 w-full h-2 bg-slate-700 rounded-full overflow-hidden flex">
          {/* Reverse Logic: High Alpha is Green/Easy, Low Alpha is Red/Hard */}
          <div className="h-full bg-rose-500" style={{ width: '33%' }}></div> {/* < 0.5 */}
          <div className="h-full bg-yellow-400" style={{ width: '17%' }}></div> {/* 0.5 - 0.75 */}
          <div className="h-full bg-emerald-500" style={{ width: '50%' }}></div> {/* > 0.75 */}
      </div>
      <div className="flex justify-between w-full text-[10px] text-slate-500 mt-1">
          <span>0.0</span>
          <span>0.5 (AnT)</span>
          <span>0.75 (AeT)</span>
          <span>1.5</span>
      </div>
    </div>
  );
};
