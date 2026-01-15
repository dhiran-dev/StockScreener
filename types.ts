
export interface OHLC {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OrderBlock {
  type: 'bullish' | 'bearish';
  top: number;
  bottom: number;
  startTime: string;
  isMitigated: boolean;
  strength: number;
}

export interface VCPStatus {
  isVCP: boolean;
  contractionRatio: number;
  volumeRatio: number;
  tightnessScore: number;
}

export interface StockMetadata {
  symbol: string;
  industry: string;
  index: string;
  marketCap: 'Large' | 'Mid' | 'Small';
}

export interface StockAnalysis {
  symbol: string;
  metadata: StockMetadata;
  score: number; // Technical probability
  fundamentalScore: number;
  orderBlocks: OrderBlock[];
  vcp: VCPStatus;
  trend: 'bullish' | 'bearish' | 'neutral';
  price: number;
  change: number;
}

export interface Bookmark {
  symbol: string;
  tags: string[];
  timestamp: number;
}

export type StrategyID = 'ob_detection' | 'vcp_breakout';
