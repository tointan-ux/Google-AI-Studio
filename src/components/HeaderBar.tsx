import React, { useState } from 'react';
import { 
  FileUp, 
  Layers, 
  Sliders, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  Sparkles,
  Printer,
  FileCheck
} from 'lucide-react';
import { PrintJob, JobStatus } from '../types/prepress';
import { DemoJobType } from '../services/demoJobGenerator';

interface HeaderBarProps {
  job: PrintJob;
  jobStatus: JobStatus;
  onOpenTiffLoader: () => void;
  onSelectDemoJob: (type: DemoJobType) => void;
  onExportCurrentPlate: () => void;
  onOpenPreflight: () => void;
  onOpenIdgSettings: () => void;
  onOpenSignOff: () => void;
  preflightSummary: { pass: number; warn: number; fail: number };
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  job,
  jobStatus,
  onOpenTiffLoader,
  onSelectDemoJob,
  onExportCurrentPlate,
  onOpenPreflight,
  onOpenIdgSettings,
  onOpenSignOff,
  preflightSummary,
}) => {
  const [demoMenuOpen, setDemoMenuOpen] = useState(false);

  const meta = job.metadata;
  const mmWidth = (meta.width / (meta.resolution / 25.4)).toFixed(1);
  const mmHeight = (meta.height / (meta.resolution / 25.4)).toFixed(1);

  return (
    <header className="h-14 border-b border-neutral-800 bg-neutral-900/90 backdrop-blur-md px-4 flex items-center justify-between z-30 select-none">
      {/* Brand & Job Info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 via-magenta-500 to-yellow-400 p-[1.5px] shadow-sm">
            <div className="w-full h-full bg-neutral-950 rounded-[7px] flex items-center justify-center">
              <span className="font-mono font-black text-xs text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-amber-300">
                SP
              </span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-white font-sans">
                SoftProof
              </span>
              <span className="text-[10px] uppercase font-mono tracking-widest px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 font-semibold">
                TIFF Engine 2.4
              </span>
              {meta.bitDepth === 1 ? (
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  1-Bit CTP Plates
                </span>
              ) : (
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                  8-Bit Separations
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="h-5 w-px bg-neutral-800 mx-1"></div>

        {/* Job Name & Specs */}
        <div className="flex items-center gap-2.5 text-xs text-neutral-300">
          <span className="font-medium text-neutral-100 max-w-[200px] truncate" title={job.name}>
            {job.name}
          </span>
          <span className="text-neutral-600">·</span>
          <span className="font-mono text-neutral-400 text-[11px]">
            {meta.width} × {meta.height} px ({mmWidth} × {mmHeight} mm)
          </span>
          <span className="text-neutral-600">·</span>
          <span className="font-mono text-amber-400 text-[11px] font-medium bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/40">
            {meta.resolution} DPI
          </span>
          <span className="text-neutral-600">·</span>
          <span className="text-neutral-400 text-[11px] hidden lg:inline">
            {meta.pressName.split(' ')[0]} {meta.pressName.split(' ')[1] || ''}
          </span>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-2">
        {/* Load Real TIFF button */}
        <button
          onClick={onOpenTiffLoader}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-cyan-600 hover:bg-cyan-500 text-white transition-all shadow-sm hover:shadow-cyan-500/20 active:scale-[0.98]"
        >
          <FileUp className="w-3.5 h-3.5" />
          <span>Load Real TIFF Plates</span>
        </button>

        {/* Sample Jobs Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDemoMenuOpen(!demoMenuOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Sample Jobs</span>
          </button>

          {demoMenuOpen && (
            <div 
              className="absolute right-0 mt-2 w-64 rounded-lg bg-neutral-900 border border-neutral-800 shadow-xl py-1 z-50 text-xs"
              onClick={() => setDemoMenuOpen(false)}
            >
              <div className="px-3 py-1.5 text-[10px] uppercase font-mono tracking-wider text-neutral-400 border-b border-neutral-800/80">
                Prepress Test Suites
              </div>
              <button
                onClick={() => onSelectDemoJob('carton')}
                className="w-full text-left px-3 py-2 hover:bg-neutral-800 text-neutral-200 flex flex-col gap-0.5"
              >
                <span className="font-medium text-white">Folding Carton Packaging</span>
                <span className="text-[11px] text-neutral-400">CMYK + Pantone 871 Gold + Spot UV + Dieline</span>
              </button>
              <button
                onClick={() => onSelectDemoJob('halftone')}
                className="w-full text-left px-3 py-2 hover:bg-neutral-800 text-neutral-200 flex flex-col gap-0.5"
              >
                <span className="font-medium text-white">1-Bit Halftone Screen Plates</span>
                <span className="text-[11px] text-neutral-400">2400 DPI AM 175 LPI Rosette Plates (C/M/Y/K)</span>
              </button>
              <button
                onClick={() => onSelectDemoJob('stochastic')}
                className="w-full text-left px-3 py-2 hover:bg-neutral-800 text-neutral-200 flex flex-col gap-0.5"
              >
                <span className="font-medium text-white">FirstPROOF Stochastic FM Plates</span>
                <span className="text-[11px] text-neutral-400">Hamillroad Auraia DMS / IDG Test Pattern</span>
              </button>
              <button
                onClick={() => onSelectDemoJob('label')}
                className="w-full text-left px-3 py-2 hover:bg-neutral-800 text-neutral-200 flex flex-col gap-0.5"
              >
                <span className="font-medium text-white">Artisan Beverage Label</span>
                <span className="text-[11px] text-neutral-400">CMYK + Reflex Blue + Warm Red + Opaque White</span>
              </button>
            </div>
          )}
        </div>

        {/* Export 1-Bit TIFF */}
        <button
          onClick={onExportCurrentPlate}
          title="Export active plate as genuine 1-bit bi-level TIFF file"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-neutral-400" />
          <span className="hidden sm:inline">Export 1-Bit TIFF</span>
        </button>

        {/* Preflight Badge Button */}
        <button
          onClick={onOpenPreflight}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors ${
            preflightSummary.fail > 0
              ? 'bg-red-950/40 border-red-800 text-red-300 hover:bg-red-900/50'
              : preflightSummary.warn > 0
              ? 'bg-amber-950/40 border-amber-800 text-amber-300 hover:bg-amber-900/50'
              : 'bg-emerald-950/40 border-emerald-800 text-emerald-300 hover:bg-emerald-900/50'
          }`}
        >
          {preflightSummary.fail > 0 ? (
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span>Preflight</span>
          <span className="font-mono text-[11px] opacity-80">
            ({preflightSummary.pass}P/{preflightSummary.warn}W/{preflightSummary.fail}F)
          </span>
        </button>

        {/* Hamillroad IDG Settings */}
        <button
          onClick={onOpenIdgSettings}
          title="Hamillroad FirstPROOF Inverse Dot Gain & Press Simulation"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors ${
            job.settings.inverseDotGainEnabled
              ? 'bg-purple-950/60 border-purple-700 text-purple-300'
              : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden md:inline">IDG Engine</span>
        </button>

        {/* Sign-Off / Approval */}
        <button
          onClick={onOpenSignOff}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm active:scale-[0.98]"
        >
          <FileCheck className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign-Off</span>
        </button>
      </div>
    </header>
  );
};
