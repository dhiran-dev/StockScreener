
import { OHLC, OrderBlock, VCPStatus, StockAnalysis, StrategyID } from '../types';

export const detectOrderBlocks = (data: OHLC[]): OrderBlock[] => {
  const obs: OrderBlock[] = [];
  const lookback = 20;

  for (let i = lookback; i < data.length - 5; i++) {
    const current = data[i];
    const prev = data[i - 1];
    const isSwingLow = current.low < prev.low && current.low < data[i + 1].low;
    const isSwingHigh = current.high > prev.high && current.high > data[i + 1].high;

    if (isSwingLow) {
      const strongMove = data[i + 3].close > current.high * 1.015;
      if (strongMove) {
        obs.push({
          type: 'bullish',
          top: Math.max(current.open, current.close),
          bottom: current.low,
          startTime: current.date,
          isMitigated: false,
          strength: (data[i + 3].close - current.low) / current.low * 100
        });
      }
    }

    if (isSwingHigh) {
      const strongMove = data[i + 3].close < current.low * 0.985;
      if (strongMove) {
        obs.push({
          type: 'bearish',
          top: current.high,
          bottom: Math.min(current.open, current.close),
          startTime: current.date,
          isMitigated: false,
          strength: (current.high - data[i + 3].close) / current.high * 100
        });
      }
    }
  }

  const currentPrice = data[data.length - 1].close;
  return obs.map(ob => {
    const checkStartIdx = data.findIndex(d => d.date === ob.startTime) + 1;
    let mitigated = false;
    for (let j = checkStartIdx; j < data.length; j++) {
      if (ob.type === 'bullish' && data[j].low < ob.bottom) mitigated = true;
      if (ob.type === 'bearish' && data[j].high > ob.top) mitigated = true;
    }
    return { ...ob, isMitigated: mitigated };
  });
};

export const detectVCP = (data: OHLC[]): VCPStatus => {
  const lookback = 20;
  const recent = data.slice(-lookback);
  const older = data.slice(-lookback * 2, -lookback);

  const getAvgRange = (slice: OHLC[]) => 
    slice.reduce((acc, d) => acc + (d.high - d.low), 0) / slice.length;
  
  const getAvgVol = (slice: OHLC[]) =>
    slice.reduce((acc, d) => acc + d.volume, 0) / slice.length;

  const recentRange = getAvgRange(recent);
  const olderRange = getAvgRange(older);
  const recentVol = getAvgVol(recent);
  const olderVol = getAvgVol(older);

  const contractionRatio = recentRange / olderRange;
  const volumeRatio = recentVol / olderVol;

  const isVCP = contractionRatio < 0.75 && volumeRatio < 0.9;
  const tightnessScore = Math.min(100, Math.max(0, (1 - contractionRatio) * 200));

  return { isVCP, contractionRatio, volumeRatio, tightnessScore };
};

export const calculateFundamentalScore = (data: OHLC[]): number => {
  // Simple "Quality" proxy using price trend consistency and volume stability
  const recent = data.slice(-60);
  const returns = recent.map((d, i) => i === 0 ? 0 : (d.close - recent[i-1].close) / recent[i-1].close);
  const positiveDays = returns.filter(r => r > 0).length;
  const trendQuality = (positiveDays / returns.length) * 100;
  
  const volVolatility = Math.abs(recent[recent.length-1].volume - (recent.reduce((a,b)=>a+b.volume,0)/recent.length));
  const volScore = Math.max(0, 100 - (volVolatility / 1000000));
  
  return Math.round((trendQuality * 0.7) + (volScore * 0.3));
};

export const calculateStrategyScore = (
  analysis: Partial<StockAnalysis>, 
  currentPrice: number, 
  strategy: StrategyID
): number => {
  let score = 0;
  const activeOBs = (analysis.orderBlocks || []).filter(ob => !ob.isMitigated);
  
  if (strategy === 'ob_detection') {
    // Priority: Bullish OB near price
    const nearOB = activeOBs.some(ob => 
      (ob.type === 'bullish' && currentPrice >= ob.bottom * 0.99 && currentPrice <= ob.top * 1.05)
    );
    if (nearOB) score += 70;
    if (analysis.trend === 'bullish') score += 30;
  } else if (strategy === 'vcp_breakout') {
    // Priority: Tight contraction
    if (analysis.vcp?.isVCP) score += 60;
    score += (analysis.vcp?.tightnessScore || 0) * 0.3;
    if (analysis.trend === 'bullish') score += 10;
  }

  return Math.min(100, score);
};
