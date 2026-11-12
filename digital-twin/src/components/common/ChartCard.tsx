import React, { ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { BarChart3 } from 'lucide-react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  heightClass?: string;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  children: ReactNode;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  badge,
  heightClass = 'h-[320px]',
  isLoading = false,
  isEmpty = false,
  emptyMessage = 'No telemetry data available for this range',
  children,
}) => {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col min-w-0 shadow-lg backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3 flex-shrink-0">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            {title}
          </h3>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
        {badge && <div className="flex-shrink-0">{badge}</div>}
      </div>

      {/* Chart Canvas Area */}
      <div className={`relative w-full ${heightClass} min-h-[220px] min-w-0`}>
        <ErrorBoundary fallbackTitle={`Error rendering ${title}`}>
          {isLoading ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950/40 rounded-lg animate-pulse">
              <div className="w-12 h-12 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin mb-2" />
              <span className="text-xs text-slate-400">Loading telemetry data...</span>
            </div>
          ) : isEmpty ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950/20 border border-slate-800/50 rounded-lg text-center p-4">
              <BarChart3 className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-xs text-slate-400 font-medium">{emptyMessage}</p>
            </div>
          ) : (
            <div className="w-full h-full min-w-0 min-h-0">
              {children}
            </div>
          )}
        </ErrorBoundary>
      </div>
    </div>
  );
};
