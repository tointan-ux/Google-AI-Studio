import React from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Info,
  ShieldCheck,
  Flame,
  Layers,
  Ruler
} from 'lucide-react';
import { PreflightReport } from '../services/preflightService';
import { PrintJob } from '../types/prepress';

interface PreflightModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: PreflightReport;
  job: PrintJob;
}

export const PreflightModal: React.FC<PreflightModalProps> = ({
  isOpen,
  onClose,
  report,
  job,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              report.failCount > 0
                ? 'bg-red-950 text-red-400 border border-red-800'
                : report.warnCount > 0
                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
            }`}>
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                Preflight Verification Audit
              </h2>
              <p className="text-[11px] text-neutral-400">
                ISO 12647 Prepress Quality Compliance Check
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Scorecard */}
        <div className="p-4 bg-neutral-950/60 border-b border-neutral-800 grid grid-cols-4 gap-3 text-center">
          <div className="p-2.5 rounded-lg bg-neutral-900/80 border border-neutral-800">
            <span className="text-[10px] text-neutral-400 uppercase font-mono block">Overall</span>
            <span className={`text-sm font-bold capitalize ${
              report.overallStatus === 'pass' ? 'text-emerald-400' :
              report.overallStatus === 'warning' ? 'text-amber-400' : 'text-red-400'
            }`}>
              {report.overallStatus}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-neutral-900/80 border border-neutral-800">
            <span className="text-[10px] text-emerald-400 uppercase font-mono block">Passed</span>
            <span className="text-sm font-bold text-emerald-300 font-mono">
              {report.passCount}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-neutral-900/80 border border-neutral-800">
            <span className="text-[10px] text-amber-400 uppercase font-mono block">Warnings</span>
            <span className="text-sm font-bold text-amber-300 font-mono">
              {report.warnCount}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-neutral-900/80 border border-neutral-800">
            <span className="text-[10px] text-red-400 uppercase font-mono block">Failed</span>
            <span className="text-sm font-bold text-red-400 font-mono">
              {report.failCount}
            </span>
          </div>
        </div>

        {/* Detailed Checks */}
        <div className="p-5 flex-1 overflow-y-auto space-y-3 text-xs">
          {report.items.map(item => (
            <div
              key={item.id}
              className={`p-3 rounded-lg border flex items-start gap-3 transition-colors ${
                item.status === 'fail'
                  ? 'bg-red-950/30 border-red-800/80 text-red-200'
                  : item.status === 'warning'
                  ? 'bg-amber-950/30 border-amber-800/70 text-amber-200'
                  : item.status === 'info'
                  ? 'bg-cyan-950/30 border-cyan-800/60 text-cyan-200'
                  : 'bg-neutral-950/60 border-neutral-800 text-neutral-300'
              }`}
            >
              <div className="mt-0.5 flex-shrink-0">
                {item.status === 'fail' ? (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                ) : item.status === 'warning' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                ) : item.status === 'info' ? (
                  <Info className="w-4 h-4 text-cyan-400" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">
                    {item.title}
                  </span>
                  {item.value && (
                    <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-neutral-900 text-neutral-300 border border-neutral-800">
                      {item.value}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  {item.detail}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-800 bg-neutral-950 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-white font-medium text-xs transition-colors"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};
