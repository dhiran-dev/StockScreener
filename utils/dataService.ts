
import { OHLC } from '../types';

/**
 * Fetches real market data from Yahoo Finance via a CORS proxy.
 * This satisfies the "Real Data" requirement without needing a 
 * local backend setup immediately.
 */
export const fetchStockData = async (symbol: string): Promise<OHLC[]> => {
  // Yahoo Finance uses .NS suffix for National Stock Exchange of India
  const ticker = symbol.endsWith('.NS') ? symbol : `${symbol}.NS`;
  
  // We use AllOrigins as a CORS proxy to bypass Yahoo's browser restrictions
  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=6mo`;
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(yahooUrl)}`;

  try {
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error('Network response was not ok');
    
    const wrapper = await response.json();
    const json = JSON.parse(wrapper.contents);
    
    const result = json.chart.result[0];
    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];
    const adjClose = result.indicators.adjclose?.[0]?.adjclose || quotes.close;

    // Transform Yahoo's column-based format to our row-based OHLC format
    const data: OHLC[] = timestamps.map((ts: number, i: number) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      open: quotes.open[i] || quotes.close[i],
      high: quotes.high[i] || quotes.close[i],
      low: quotes.low[i] || quotes.close[i],
      close: adjClose[i] || quotes.close[i],
      volume: quotes.volume[i] || 0
    })).filter((d: any) => d.open !== null && d.close !== null);

    return data;
  } catch (error) {
    console.error(`Error fetching real data for ${symbol}:`, error);
    throw error;
  }
};
