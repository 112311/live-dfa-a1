import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { DFADataPoint } from '../types';
import { THRESHOLD_AEROBIC, THRESHOLD_ANAEROBIC } from '../constants';

interface Props {
  data: DFADataPoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-slate-700 p-2 rounded shadow text-xs text-white">
        <p>{`Time: ${label}`}</p>
        <p className="text-rose-400">{`HR: ${payload[0].value}`}</p>
        <p className="text-emerald-400">{`α1: ${payload[1].value}`}</p>
      </div>
    );
  }
  return null;
};

export const HistoryChart: React.FC<Props> = ({ data }) => {
  // Format data relative time
  const startTime = data.length > 0 ? data[0].timestamp : 0;
  const chartData = data.map(d => ({
    ...d,
    timeStr: new Date(d.timestamp - startTime).toISOString().substr(14, 5), // mm:ss
    alpha1: Number(d.alpha1.toFixed(2))
  }));

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis 
            dataKey="timeStr" 
            stroke="#94a3b8" 
            tick={{fontSize: 12}}
            minTickGap={30}
          />
          <YAxis 
            yAxisId="hr"
            orientation="left" 
            stroke="#fb7185" 
            domain={['auto', 'auto']}
            tick={{fontSize: 12}}
            label={{ value: 'HR', angle: -90, position: 'insideLeft', fill: '#fb7185' }}
          />
          <YAxis 
            yAxisId="a1"
            orientation="right" 
            stroke="#34d399" 
            domain={[0, 1.5]} 
            tick={{fontSize: 12}}
            label={{ value: 'α1', angle: 90, position: 'insideRight', fill: '#34d399' }}
          />
          <Tooltip content={<CustomTooltip />} />
          
          <ReferenceLine y={THRESHOLD_AEROBIC} yAxisId="a1" stroke="#34d399" strokeDasharray="3 3" label={{ position: 'right', value: 'AeT (0.75)', fill: '#34d399', fontSize: 10 }} />
          <ReferenceLine y={THRESHOLD_ANAEROBIC} yAxisId="a1" stroke="#facc15" strokeDasharray="3 3" label={{ position: 'right', value: 'AnT (0.5)', fill: '#facc15', fontSize: 10 }} />

          <Line 
            yAxisId="hr"
            type="monotone" 
            dataKey="heartRate" 
            stroke="#fb7185" 
            strokeWidth={2} 
            dot={false}
          />
          <Line 
            yAxisId="a1"
            type="monotone" 
            dataKey="alpha1" 
            stroke="#34d399" 
            strokeWidth={2} 
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
