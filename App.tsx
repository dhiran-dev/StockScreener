
import React, { useState, useEffect, useMemo } from 'react';
import { OHLC, StockAnalysis, StrategyID, StockMetadata, Bookmark } from './types';
import { NSE_WATCHLIST, INDUSTRIES, INDICES } from './utils/mockData';
import { detectOrderBlocks, detectVCP, calculateStrategyScore, calculateFundamentalScore } from './utils/analysis';
import { getTradeRationale } from './services/geminiService';
import { fetchStockData } from './utils/dataService';
import StockChart from './components/StockChart';
import HelpModal from './components/HelpModal';

type AppStep = 'landing' | 'scanning' | 'results';
type SidebarView = 'market' | 'bookmarks';

interface Strategy {
  id: StrategyID;
  name: string;
  description: string;
  icon: string;
}

const STRATEGIES: Strategy[] = [
  { 
    id: 'ob_detection', 
    name: 'Order Block Hunter', 
    description: 'Find unmitigated institutional accumulation zones for perfect entries.',
    icon: '💎'
  },
  { 
    id: 'vcp_breakout', 
    name: 'VCP Mastermind', 
    description: 'Detect Volatility Contraction Patterns and impending explosive breakouts.',
    icon: '🌋'
  }
];

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>('landing');
  const [sidebarView, setSidebarView] = useState<SidebarView>('market');
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy>(STRATEGIES[0]);
  const [filterIndex, setFilterIndex] = useState<string>("Nifty 50");
  const [filterIndustry, setFilterIndustry] = useState<string>("All");
  
  // Bookmarks state
  const [bookmarks, setBookmarks] = useState<Record<string, Bookmark>>({});
  const [showTagEditor, setShowTagEditor] = useState(false);
  const [newTag, setNewTag] = useState('');

  const [scanningProgress, setScanningProgress] = useState(0);
  const [currentScanningSymbol, setCurrentScanningSymbol] = useState("");
  const [allAnalyses, setAllAnalyses] = useState<StockAnalysis[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [aiRationale, setAiRationale] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [chartDataCache, setChartDataCache] = useState<Record<string, OHLC[]>>({});

  const hasApiKey = !!process.env.API_KEY && process.env.API_KEY !== 'undefined' && process.env.API_KEY.trim() !== '';

  // Load bookmarks on init
  useEffect(() => {
    const saved = localStorage.getItem('alpha_bookmarks');
    if (saved) {
      try {
        setBookmarks(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse bookmarks", e);
      }
    }
  }, []);

  // Save bookmarks when updated
  useEffect(() => {
    localStorage.setItem('alpha_bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  const toggleBookmark = (symbol: string) => {
    setBookmarks(prev => {
      const next = { ...prev };
      if (next[symbol]) {
        delete next[symbol];
      } else {
        next[symbol] = { symbol, tags: [], timestamp: Date.now() };
      }
      return next;
    });
  };

  const addTag = (symbol: string, tag: string) => {
    if (!tag.trim()) return;
    setBookmarks(prev => ({
      ...prev,
      [symbol]: {
        ...prev[symbol],
        tags: Array.from(new Set([...prev[symbol].tags, tag.trim()]))
      }
    }));
    setNewTag('');
  };

  const removeTag = (symbol: string, tag: string) => {
    setBookmarks(prev => ({
      ...prev,
      [symbol]: {
        ...prev[symbol],
        tags: prev[symbol].tags.filter(t => t !== tag)
      }
    }));
  };

  const filteredWatchlist = useMemo(() => {
    return NSE_WATCHLIST.filter(s => {
      const matchIndex = s.index === filterIndex;
      const matchIndustry = filterIndustry === "All" || s.industry === filterIndustry;
      return matchIndex && matchIndustry;
    });
  }, [filterIndex, filterIndustry]);

  const startScan = async () => {
    if (filteredWatchlist.length === 0) return alert("No stocks found for the selected filters.");
    
    setStep('scanning');
    setScanningProgress(0);
    const results: StockAnalysis[] = [];
    const cache: Record<string, OHLC[]> = {};

    for (let i = 0; i < filteredWatchlist.length; i++) {
      const meta = filteredWatchlist[i];
      setCurrentScanningSymbol(meta.symbol);
      try {
        const data = await fetchStockData(meta.symbol);
        cache[meta.symbol] = data;
        
        const obs = detectOrderBlocks(data);
        const vcp = detectVCP(data);
        const currentPrice = data[data.length - 1].close;
        const prevPrice = data[data.length - 2].close;
        
        const analysis: StockAnalysis = {
          symbol: meta.symbol,
          metadata: meta,
          price: currentPrice,
          change: ((currentPrice - prevPrice) / prevPrice) * 100,
          orderBlocks: obs,
          vcp,
          trend: currentPrice > data[data.length - 50]?.close ? 'bullish' : 'bearish',
          score: 0,
          fundamentalScore: calculateFundamentalScore(data)
        };
        
        analysis.score = calculateStrategyScore(analysis, currentPrice, selectedStrategy.id);
        results.push(analysis);
      } catch (err) {
        console.warn(`Error scanning ${meta.symbol}`);
      }
      setScanningProgress(Math.round(((i + 1) / filteredWatchlist.length) * 100));
    }

    setAllAnalyses(results.sort((a, b) => b.score - a.score));
    setChartDataCache(cache);
    if (results.length > 0) setSelectedSymbol(results[0].symbol);
    setStep('results');
  };

  const currentAnalysis = useMemo(() => 
    allAnalyses.find(a => a.symbol === selectedSymbol), 
    [allAnalyses, selectedSymbol]
  );

  const displayedList = useMemo(() => {
    if (sidebarView === 'market') return allAnalyses;
    return allAnalyses.filter(a => !!bookmarks[a.symbol]);
  }, [allAnalyses, sidebarView, bookmarks]);

  const currentChartData = useMemo(() => 
    selectedSymbol ? chartDataCache[selectedSymbol] : [], 
    [selectedSymbol, chartDataCache]
  );

  useEffect(() => {
    if (currentAnalysis && step === 'results') {
      setIsAiLoading(true);
      getTradeRationale(currentAnalysis).then(rationale => {
        setAiRationale(rationale);
        setIsAiLoading(false);
      });
    }
  }, [selectedSymbol, currentAnalysis, step]);

  if (step === 'landing') {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-950 p-6 overflow-auto relative">
        <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
        
        <button 
          onClick={() => setIsHelpOpen(true)}
          className="absolute top-8 right-8 p-3 bg-slate-900 border border-slate-800 rounded-full text-slate-400 hover:text-emerald-400 transition-colors shadow-xl"
          title="Technical Help"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </button>

        <div className="max-w-5xl w-full space-y-12">
          <header className="text-center">
            <h1 className="text-6xl font-black bg-gradient-to-r from-emerald-400 via-sky-400 to-indigo-500 bg-clip-text text-transparent mb-4 tracking-tighter">
              AlphaScreener
            </h1>
            <p className="text-slate-400 text-lg">Professional NSE Scanner with SMC & VCP Detection</p>
            {!hasApiKey && (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-500 text-xs font-bold uppercase tracking-widest">
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                AI Rationale Offline (No API Key)
              </div>
            )}
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 bg-slate-900/40 p-10 rounded-[3rem] border border-slate-800">
            {/* Strategy Selection */}
            <div className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 px-2">1. Choose Strategy</h3>
              <div className="space-y-4">
                {STRATEGIES.map(strat => (
                  <button
                    key={strat.id}
                    onClick={() => setSelectedStrategy(strat)}
                    className={`w-full text-left p-6 rounded-3xl border-2 transition-all group ${
                      selectedStrategy.id === strat.id 
                      ? 'border-emerald-500 bg-emerald-500/10' 
                      : 'border-slate-800 bg-slate-900 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-4xl">{strat.icon}</span>
                      <div>
                        <h4 className="text-xl font-bold text-white">{strat.name}</h4>
                        <p className="text-sm text-slate-500">{strat.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Selection */}
            <div className="space-y-8">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 px-2">2. Refine Universe</h3>
              
              <div className="space-y-4">
                <label className="block">
                  <span className="text-xs font-bold text-slate-400 mb-2 block">Market Index</span>
                  <div className="flex gap-2 flex-wrap">
                    {INDICES.map(idx => (
                      <button
                        key={idx}
                        onClick={() => setFilterIndex(idx)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                          filterIndex === idx ? 'bg-white text-slate-950 border-white' : 'border-slate-800 text-slate-400'
                        }`}
                      >
                        {idx}
                      </button>
                    ))}
                  </div>
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-slate-400 mb-2 block">Industry Category</span>
                  <select 
                    value={filterIndustry}
                    onChange={(e) => setFilterIndustry(e.target.value)}
                    className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl p-4 text-white font-bold appearance-none outline-none focus:border-emerald-500 transition-colors"
                  >
                    <option value="All">All Industries</option>
                    {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                  </select>
                </label>
              </div>

              <div className="pt-4">
                <button
                  onClick={startScan}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-5 rounded-3xl text-xl shadow-2xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-4"
                >
                  Scan {filteredWatchlist.length} Symbols
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'scanning') {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="w-32 h-32 border-8 border-slate-900 border-t-emerald-500 rounded-full animate-spin mx-auto mb-8"></div>
          <h2 className="text-4xl font-black mb-2 tracking-tighter">{scanningProgress}%</h2>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Analyzing {currentScanningSymbol}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-slate-950 text-slate-200 overflow-hidden relative">
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      
      {/* Sidebar */}
      <aside className="w-80 border-r border-slate-800 bg-slate-900/50 flex flex-col shadow-2xl">
        <div className="p-6 bg-slate-900 border-b border-slate-800">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="font-black text-xs text-emerald-400 tracking-[0.2em] uppercase">Signals</h2>
              <p className="text-[10px] text-slate-500">{selectedStrategy.name}</p>
            </div>
            <div className="flex gap-2">
               <button 
                onClick={() => setIsHelpOpen(true)}
                className="p-2 text-slate-500 hover:text-emerald-400 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </button>
              <button onClick={() => setStep('landing')} className="text-slate-600 hover:text-white transition-colors p-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
          
          <div className="flex bg-slate-950 p-1 rounded-xl">
            <button 
              onClick={() => setSidebarView('market')}
              className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${sidebarView === 'market' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500'}`}
            >
              Market
            </button>
            <button 
              onClick={() => setSidebarView('bookmarks')}
              className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${sidebarView === 'bookmarks' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500'}`}
            >
              Saved ({Object.keys(bookmarks).length})
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {displayedList.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-widest leading-relaxed">
                {sidebarView === 'market' ? 'No stocks scanned yet' : 'No bookmarked stocks in this session'}
              </p>
            </div>
          ) : displayedList.map((analysis, index) => (
            <button
              key={analysis.symbol}
              onClick={() => setSelectedSymbol(analysis.symbol)}
              className={`w-full text-left p-4 rounded-2xl transition-all border group relative ${
                selectedSymbol === analysis.symbol ? 'bg-white/5 border-emerald-500/50 shadow-xl' : 'border-transparent hover:bg-slate-800/30'
              }`}
            >
              {bookmarks[analysis.symbol] && (
                <div className="absolute top-4 right-4 text-emerald-500">
                  <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                </div>
              )}
              <div className="flex justify-between items-start">
                <span className="font-black text-sm">{analysis.symbol}</span>
                <div className="text-[10px] font-black bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded">
                  {analysis.score}% Match
                </div>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-[10px] text-slate-500 font-bold">{analysis.metadata.industry}</span>
                <span className={`text-[10px] font-bold ${analysis.fundamentalScore >= 70 ? 'text-blue-400' : 'text-slate-600'}`}>
                  H: {analysis.fundamentalScore}
                </span>
              </div>
              {bookmarks[analysis.symbol]?.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {bookmarks[analysis.symbol].tags.slice(0, 2).map(t => (
                    <span key={t} className="text-[8px] px-1 bg-slate-800 text-slate-400 rounded-sm font-bold uppercase tracking-tighter">#{t}</span>
                  ))}
                  {bookmarks[analysis.symbol].tags.length > 2 && <span className="text-[8px] text-slate-600 font-bold">+{bookmarks[analysis.symbol].tags.length - 2}</span>}
                </div>
              )}
            </button>
          ))}
        </div>
      </aside>

      {/* Main View */}
      <main className="flex-1 p-8 space-y-8 overflow-y-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 to-slate-950">
        {selectedSymbol && currentAnalysis ? (
          <>
            <header className="flex justify-between items-start">
              <div className="space-y-4">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-4">
                    <h2 className="text-5xl font-black tracking-tighter">{selectedSymbol}</h2>
                    <button 
                      onClick={() => toggleBookmark(selectedSymbol)}
                      className={`p-2 rounded-full transition-all border ${bookmarks[selectedSymbol] ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' : 'bg-slate-900 border-slate-800 text-slate-600 hover:text-white'}`}
                      title={bookmarks[selectedSymbol] ? "Remove Bookmark" : "Add Bookmark"}
                    >
                      <svg className={`w-6 h-6 ${bookmarks[selectedSymbol] ? 'fill-current' : 'fill-none'}`} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.175 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.382-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                    </button>
                  </div>
                  <span className="text-[10px] font-black text-slate-500 bg-slate-800 px-3 py-1 rounded-full uppercase tracking-widest">
                    {currentAnalysis.metadata.index} • {currentAnalysis.metadata.industry}
                  </span>
                </div>
                
                {/* Bookmark Tags UI */}
                {bookmarks[selectedSymbol] && (
                  <div className="flex items-center gap-2 flex-wrap min-h-[32px]">
                    {bookmarks[selectedSymbol].tags.map(tag => (
                      <span key={tag} className="bg-emerald-500/10 text-emerald-500 text-[10px] font-black px-2 py-1 rounded-lg border border-emerald-500/20 flex items-center gap-1 group">
                        {tag}
                        <button onClick={() => removeTag(selectedSymbol, tag)} className="hover:text-white">×</button>
                      </span>
                    ))}
                    {showTagEditor ? (
                      <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg">
                        <input 
                          autoFocus
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addTag(selectedSymbol, newTag)}
                          placeholder="New tag..."
                          className="bg-transparent outline-none text-[10px] font-bold px-2 w-20 text-white"
                        />
                        <button onClick={() => setShowTagEditor(false)} className="p-1 hover:bg-slate-800 rounded text-slate-500">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setShowTagEditor(true)}
                        className="text-[10px] font-bold text-slate-600 hover:text-emerald-400 transition-colors py-1 px-2 border border-slate-800 border-dashed rounded-lg"
                      >
                        + Add Tag
                      </button>
                    )}
                  </div>
                )}
                <p className="text-slate-500 font-bold text-sm">₹{currentAnalysis.price.toLocaleString('en-IN')}</p>
              </div>

              <div className="flex gap-4">
                <MetricBox label="Strategy Score" value={currentAnalysis.score} sub="Technical Probability" color="text-emerald-400" />
                <MetricBox label="Health Score" value={currentAnalysis.fundamentalScore} sub="Price Stability" color="text-blue-400" />
              </div>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              <div className="xl:col-span-2 h-[500px]">
                <StockChart data={currentChartData} orderBlocks={currentAnalysis.orderBlocks} />
              </div>

              <div className="space-y-6">
                <section className="bg-slate-900 border border-slate-800 p-8 rounded-[3rem] relative overflow-hidden">
                  {!hasApiKey && <div className="absolute top-0 right-0 p-4"><span className="text-[8px] font-black text-amber-500 bg-amber-500/10 px-2 py-1 rounded uppercase">Offline</span></div>}
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                    Trade Rationale
                  </h3>
                  {isAiLoading ? <div className="animate-pulse space-y-3"><div className="h-4 bg-slate-800 rounded w-full"></div><div className="h-4 bg-slate-800 rounded w-3/4"></div></div> : (
                    <p className={`text-lg font-medium leading-relaxed italic ${hasApiKey ? 'text-slate-300' : 'text-slate-500'}`}>"{aiRationale}"</p>
                  )}
                </section>

                <section className="bg-slate-900 border border-slate-800 p-8 rounded-[3rem]">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6">Technical Logs</h3>
                  <div className="space-y-4">
                    <Check label="Fresh Order Block" met={currentAnalysis.orderBlocks.some(ob => !ob.isMitigated)} />
                    <Check label="VCP Contraction" met={currentAnalysis.vcp.isVCP} />
                    <Check label="Volume Dry-out" met={currentAnalysis.vcp.volumeRatio < 1} />
                    <Check label="Higher High Momentum" met={currentAnalysis.trend === 'bullish'} />
                  </div>
                </section>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-800">
             <div className="w-24 h-24 mb-6 border-4 border-slate-800 border-dashed rounded-full animate-[spin_10s_linear_infinite] flex items-center justify-center">
                <svg className="w-10 h-10 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
             </div>
             <p className="font-black uppercase tracking-[0.5em] text-sm">Awaiting Analysis Selection</p>
          </div>
        )}
      </main>
    </div>
  );
};

const MetricBox: React.FC<{ label: string; value: number; sub: string; color: string }> = ({ label, value, sub, color }) => (
  <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-3xl min-w-[140px] text-center shadow-xl">
    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">{label}</p>
    <p className={`text-3xl font-black ${color}`}>{value}%</p>
    <p className="text-[10px] font-bold text-slate-700 mt-1 uppercase">{sub}</p>
  </div>
);

const Check: React.FC<{ label: string; met: boolean }> = ({ label, met }) => (
  <div className="flex justify-between items-center">
    <span className="text-sm font-bold text-slate-400">{label}</span>
    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${met ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 scale-110' : 'bg-slate-800 text-slate-600 opacity-50'}`}>
      {met ? '✓' : '×'}
    </span>
  </div>
);

export default App;
