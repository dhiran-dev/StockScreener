
import React from 'react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-[2.5rem] shadow-2xl flex flex-col">
        <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-black tracking-tighter text-white">Engineering Guide</h2>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">AlphaScreener Documentation</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-8 space-y-8">
          {/* Section 1: Data Architecture */}
          <section>
            <h3 className="text-emerald-400 font-black text-xs uppercase tracking-widest mb-3">01. Data Architecture</h3>
            <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
              <p>
                The app utilizes the <span className="text-white font-mono">Yahoo Finance Chart V8 API</span>. To circumvent browser-side CORS restrictions, requests are routed through a 
                <span className="text-white font-mono"> AllOrigins CORS Proxy</span>.
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li>Interval: 1D (Daily)</li>
                <li>Lookback: 6 Months (approx. 125 trading sessions)</li>
                <li>Symbols: NSE-India specific (.NS suffix)</li>
              </ul>
            </div>
          </section>

          {/* Section 2: Strategy Logic */}
          <section>
            <h3 className="text-sky-400 font-black text-xs uppercase tracking-widest mb-3">02. Technical Detection Logic</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Order Blocks
                </h4>
                <p className="text-xs text-slate-400">Identifies candles preceding a &gt;1.5% impulsive move within 3 bars. "Mitigation" is flagged if subsequent price action touches the OB boundaries.</p>
              </div>
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-sky-500 rounded-full"></span> VCP Analysis
                </h4>
                <p className="text-xs text-slate-400">Measures the 20-bar Average True Range (ATR) against the previous 20-bar window. Requires a contraction ratio &lt; 0.75 and volume &lt; 0.9x average.</p>
              </div>
            </div>
          </section>

          {/* Section 3: Limitations */}
          <section className="bg-rose-500/5 border border-rose-500/20 p-6 rounded-2xl">
            <h3 className="text-rose-400 font-black text-xs uppercase tracking-widest mb-3">Critical Limitations</h3>
            <ul className="space-y-3 text-xs text-slate-400 list-none">
              <li className="flex gap-3">
                <span className="text-rose-500 font-bold">●</span>
                <span><strong className="text-slate-200">Heuristic Fundamental Proxy:</strong> Fundamental scores are calculated based on price trend consistency (positive return days) and volume stability, NOT actual balance sheet data.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-rose-500 font-bold">●</span>
                <span><strong className="text-slate-200">Proxy Latency:</strong> Public CORS proxies can experience downtime or rate-limiting. A local Flask backend is recommended for production scale.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-rose-500 font-bold">●</span>
                <span><strong className="text-slate-200">Execution Delay:</strong> The Yahoo Chart API provides data with a typical 15-minute lag for NSE symbols.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-rose-500 font-bold">●</span>
                <span><strong className="text-slate-200">Static Timeframe:</strong> Analysis is currently hardcoded to 1-Day candles. Multi-timeframe confluence is not yet calculated.</span>
              </li>
            </ul>
          </section>
        </div>

        <div className="p-8 border-t border-slate-800 bg-slate-950/50 text-center">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em]">Built for Research Purposes • Not Financial Advice</p>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
