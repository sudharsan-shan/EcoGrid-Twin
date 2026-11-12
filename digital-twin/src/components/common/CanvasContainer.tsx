import React, { ReactNode, useState, useEffect } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { Box, AlertCircle } from 'lucide-react';

interface CanvasContainerProps {
  children: ReactNode;
  fallbackMessage?: string;
}

export const CanvasContainer: React.FC<CanvasContainerProps> = ({
  children,
  fallbackMessage = 'WebGL is not supported or hardware acceleration is disabled in your browser.',
}) => {
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      setWebglSupported(Boolean(gl));
    } catch {
      setWebglSupported(false);
    }
  }, []);

  if (webglSupported === false) {
    return (
      <div className="w-full h-full min-h-[480px] flex flex-col items-center justify-center bg-slate-950/80 border border-slate-800 rounded-xl p-8 text-center">
        <AlertCircle className="w-12 h-12 text-amber-400 mb-3" />
        <h3 className="text-base font-semibold text-slate-100 mb-1">WebGL 3D Context Unavailable</h3>
        <p className="text-xs text-slate-400 max-w-md">{fallbackMessage}</p>
        <span className="mt-4 px-3 py-1.5 bg-slate-900 border border-slate-700 text-xs text-slate-300 rounded-md">
          Hardware Acceleration check failed
        </span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[480px] flex-1 overflow-hidden rounded-xl bg-slate-950/60 border border-slate-800">
      <ErrorBoundary fallbackTitle="3D Digital Twin Rendering Error">
        {webglSupported === null ? (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <Box className="w-8 h-8 text-emerald-400 animate-spin mb-2" />
            <span className="text-xs text-slate-400">Initializing 3D building twin...</span>
          </div>
        ) : (
          children
        )}
      </ErrorBoundary>
    </div>
  );
};
