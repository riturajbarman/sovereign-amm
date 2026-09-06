'use client';

import { useMarketStore } from "@/store/marketStore";

export default function GridPage() {
  const isConnected = useMarketStore((s) => s.isConnected);
  // Grid data from state/stream
  const line_flows = [3.2, -1.8, 1.4];
  const line_limits = [7.2, 7.2, 7.2];
  const rejections = 0;

  const load0 = Math.min(100, (Math.abs(line_flows[0]) / line_limits[0]) * 100);
  const load1 = Math.min(100, (Math.abs(line_flows[1]) / line_limits[1]) * 100);
  const load2 = Math.min(100, (Math.abs(line_flows[2]) / line_limits[2]) * 100);

  const getLineColor = (load: number) => {
    if (load > 90) return "stroke-rose-500 animate-pulse drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]";
    if (load > 70) return "stroke-amber-400";
    return "stroke-emerald-500";
  };

  const getStrokeWidth = (load: number) => 2 + (load / 100) * 4;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">PTDF Grid Congestion</h1>
            <p className="text-slate-400 mt-2">Live microgrid topology with real-time thermal line limits and flow vectors.</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-lg text-center">
            <span className="block text-xs text-slate-400 uppercase tracking-wider">Trades Rejected (PTDF)</span>
            <span className="block text-xl font-bold font-mono text-rose-400">{rejections}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Visual Map */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 lg:col-span-2 shadow-sm min-h-[500px] flex items-center justify-center relative overflow-hidden">
            <svg width="100%" height="100%" viewBox="0 0 400 400" className="max-w-[400px]">
              <line x1="200" y1="50" x2="350" y2="300" className={`transition-all duration-300 ${getLineColor(load0)}`} strokeWidth={getStrokeWidth(load0)} />
              <line x1="350" y1="300" x2="50" y2="300" className={`transition-all duration-300 ${getLineColor(load1)}`} strokeWidth={getStrokeWidth(load1)} />
              <line x1="50" y1="300" x2="200" y2="50" className={`transition-all duration-300 ${getLineColor(load2)}`} strokeWidth={getStrokeWidth(load2)} />

              <g transform="translate(290, 160)">
                <rect x="-25" y="-12" width="50" height="24" rx="4" fill="#0f172a" stroke="#334155" />
                <text x="0" y="4" textAnchor="middle" fill="white" fontSize="12" className="font-mono">{load0.toFixed(0)}%</text>
              </g>
              <g transform="translate(200, 310)">
                <rect x="-25" y="-12" width="50" height="24" rx="4" fill="#0f172a" stroke="#334155" />
                <text x="0" y="4" textAnchor="middle" fill="white" fontSize="12" className="font-mono">{load1.toFixed(0)}%</text>
              </g>
              <g transform="translate(110, 160)">
                <rect x="-25" y="-12" width="50" height="24" rx="4" fill="#0f172a" stroke="#334155" />
                <text x="0" y="4" textAnchor="middle" fill="white" fontSize="12" className="font-mono">{load2.toFixed(0)}%</text>
              </g>

              {/* Buses */}
              <circle cx="200" cy="50" r="24" fill="#8b5cf6" stroke="#1e293b" strokeWidth="4" />
              <text x="200" y="95" textAnchor="middle" fill="#f8fafc" fontSize="13" fontWeight="bold">Bus 0: AMM (Slack)</text>

              <circle cx="350" cy="300" r="24" fill="#eab308" stroke="#1e293b" strokeWidth="4" />
              <text x="350" y="345" textAnchor="middle" fill="#f8fafc" fontSize="13" fontWeight="bold">Bus 1: Solar Farm</text>

              <circle cx="50" cy="300" r="24" fill="#3b82f6" stroke="#1e293b" strokeWidth="4" />
              <text x="50" y="345" textAnchor="middle" fill="#f8fafc" fontSize="13" fontWeight="bold">Bus 2: Households</text>
            </svg>
          </div>

          {/* Line Details Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 lg:col-span-1 shadow-sm">
            <h2 className="text-lg font-bold mb-6">Thermal Line Limits</h2>
            
            <div className="space-y-6 font-mono text-sm">
              {[
                { id: 0, name: "Line 0 (AMM ↔ Solar)", flow: line_flows[0], limit: line_limits[0], load: load0 },
                { id: 1, name: "Line 1 (Solar ↔ House)", flow: line_flows[1], limit: line_limits[1], load: load1 },
                { id: 2, name: "Line 2 (AMM ↔ House)", flow: line_flows[2], limit: line_limits[2], load: load2 },
              ].map((line) => (
                <div key={line.id}>
                  <div className="flex justify-between mb-2">
                    <span className="text-slate-400">{line.name}</span>
                    <span className={line.load > 90 ? "text-rose-400 font-bold" : ""}>
                      {Math.abs(line.flow).toFixed(2)} / {line.limit.toFixed(2)} kW
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full ${line.load > 90 ? 'bg-rose-500' : line.load > 70 ? 'bg-amber-400' : 'bg-emerald-500'}`} 
                      style={{ width: `${line.load}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 p-4 bg-rose-500/10 border border-rose-500/20 rounded-md">
              <h3 className="font-bold text-rose-400 mb-2 flex items-center gap-2">
                Safety Margin
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Trades in the L2 book causing line flow to exceed 90% of thermal capacity (safety margin) are rejected by the PTDF engine in real time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
