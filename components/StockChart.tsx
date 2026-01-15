
import React from 'react';
import { 
  ComposedChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceArea,
  Line
} from 'recharts';
import { OHLC, OrderBlock } from '../types';

interface StockChartProps {
  data: OHLC[];
  orderBlocks: OrderBlock[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-800 border border-slate-700 p-3 rounded shadow-xl text-xs space-y-1">
        <p className="font-bold text-slate-300">{data.date}</p>
        <p className="text-emerald-400">O: {data.open.toFixed(2)}</p>
        <p className="text-emerald-400">H: {data.high.toFixed(2)}</p>
        <p className="text-rose-400">L: {data.low.toFixed(2)}</p>
        <p className="text-white">C: {data.close.toFixed(2)}</p>
        <p className="text-slate-400">V: {(data.volume / 1000000).toFixed(2)}M</p>
      </div>
    );
  }
  return null;
};

const StockChart: React.FC<StockChartProps> = ({ data, orderBlocks }) => {
  // Find visible y-axis range
  const prices = data.flatMap(d => [d.high, d.low]);
  const minPrice = Math.min(...prices) * 0.98;
  const maxPrice = Math.max(...prices) * 1.02;

  return (
    <div className="h-full w-full bg-slate-900/50 rounded-xl border border-slate-800 p-4">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis 
            dataKey="date" 
            stroke="#64748b" 
            fontSize={10} 
            tickFormatter={(val) => val.split('-').slice(1).join('/')}
          />
          <YAxis 
            domain={[minPrice, maxPrice]} 
            orientation="right" 
            stroke="#64748b" 
            fontSize={10} 
            tickFormatter={(val) => val.toFixed(0)}
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Order Block Visualizations */}
          {orderBlocks.filter(ob => !ob.isMitigated).map((ob, idx) => (
            <ReferenceArea
              key={`ob-${idx}`}
              x1={ob.startTime}
              x2={data[data.length - 1].date}
              y1={ob.bottom}
              y2={ob.top}
              fill={ob.type === 'bullish' ? '#10b981' : '#f43f5e'}
              fillOpacity={0.15}
              stroke={ob.type === 'bullish' ? '#10b981' : '#f43f5e'}
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          ))}

          {/* Candlesticks simulated with Bar (Simplified for Recharts) */}
          <Bar 
            dataKey="high" 
            fill="#334155" 
            radius={[2, 2, 0, 0]} 
            barSize={1}
          />
          <Bar 
            dataKey={(d: any) => d.close >= d.open ? [d.open, d.close] : [d.close, d.open]}
            shape={(props: any) => {
              const { x, y, width, height, payload } = props;
              const isUp = payload.close >= payload.open;
              return (
                <rect 
                  x={x - 3} 
                  y={y} 
                  width={6} 
                  height={height} 
                  fill={isUp ? '#10b981' : '#f43f5e'} 
                />
              );
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StockChart;
