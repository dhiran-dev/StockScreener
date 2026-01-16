import { OHLC } from '../types';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface UsageStats {
  daily: number;
  hourly: number;
  minute: number;
}

const TRACKING_KEY = 'yahoo_usage_tracking';

const getInitialTracking = () => ({
  dailyCount: 0,
  hourlyCount: 0,
  minuteCount: 0,
  lastDay: new Date().toDateString(),
  lastHour: new Date().getHours(),
  lastMinute: new Date().getMinutes()
});

const updateUsage = () => {
  const now = new Date();
  const raw = localStorage.getItem(TRACKING_KEY);
  let data = raw ? JSON.parse(raw) : getInitialTracking();

  const currentDay = now.toDateString();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  if (data.lastDay !== currentDay) {
    data.dailyCount = 0;
    data.lastDay = currentDay;
  }
  if (data.lastHour !== currentHour) {
    data.hourlyCount = 0;
    data.lastHour = currentHour;
  }
  if (data.lastMinute !== currentMinute) {
    data.minuteCount = 0;
    data.lastMinute = currentMinute;
  }

  data.dailyCount++;
  data.hourlyCount++;
  data.minuteCount++;

  localStorage.setItem(TRACKING_KEY, JSON.stringify(data));
};

export const getUsageStats = (): UsageStats => {
  const now = new Date();
  const raw = localStorage.getItem(TRACKING_KEY);
  if (!raw) return { daily: 0, hourly: 0, minute: 0 };
  
  const data = JSON.parse(raw);
  const currentDay = now.toDateString();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  return {
    daily: data.lastDay === currentDay ? data.dailyCount : 0,
    hourly: data.lastHour === currentHour ? data.hourlyCount : 0,
    minute: data.lastMinute === currentMinute ? data.minuteCount : 0
  };
};

/**
 * Fetches real market data from Yahoo Finance.
 * Optimized with rate-limit awareness.
 */
export const fetchStockData = async (symbol: string): Promise<OHLC[]> => {
  // Yahoo Finance uses .NS suffix for National Stock Exchange of India
  const ticker = symbol.endsWith('.NS') ? symbol : `${symbol}.NS`;
  
  const proxyUrl = `/api/yahoo/v8/finance/chart/${ticker}?interval=1d&range=6mo`;

  try {
    updateUsage();
    let response = await fetch(proxyUrl);
    
    // 2-stage exponential backoff for 429
    if (response.status === 429) {
      console.warn(`[Smart Strategy] Rate limited for ${symbol}. Retrying in 2s (1/2)...`);
      await sleep(2000);
      updateUsage();
      response = await fetch(proxyUrl);
      
      if (response.status === 429) {
        console.warn(`[Smart Strategy] Still limited for ${symbol}. Retrying in 4s (2/2)...`);
        await sleep(4000);
        updateUsage();
        response = await fetch(proxyUrl);
      }
    }

    if (response.status === 429) {
       console.error(`[Smart Strategy] Exhausted retries for ${symbol}. Please check the Data Hygiene dashboard on the Landing Page.`);
    }

    if (!response.ok) throw new Error(`Network response was not ok: ${response.status}`);
    
    const json = await response.json();
    const result = json.chart.result[0];
    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];
    const adjClose = result.indicators.adjclose?.[0]?.adjclose || quotes.close;

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
