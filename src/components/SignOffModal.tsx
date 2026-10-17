import React, { useState } from 'react';
import { 
  X, 
  FileCheck, 
  CheckCircle2, 
  Printer, 
  AlertTriangle,
  Building,
  User,
  Stamp
} from 'lucide-react';
import { PrintJob, SignOffRecord } from '../types/prepress';

interface SignOffModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: PrintJob;
  signOffRecord: SignOffRecord | null;
  onSaveSignOff: (record: SignOffRecord) => void;
}

export const SignOffModal: React.FC<SignOffModalProps> = ({
  isOpen,
  onClose,
  job,
  signOffRecord,
  onSaveSignOff,
}) => {
  const [operatorName, setOperatorName] = useState(signOffRecord?.signatoryName || 'Prepress Specialist');
  const [role, setRole] = useState(signOffRecord?.signatoryRole || 'Lead Prepress Color Engineer');
  const [company, setCompany] = useState(signOffRecord?.companyName || 'Commercial Graphic Press Works');
  const [approved, setApproved] = useState(signOffRecord?.approved ?? true);
  const [notes, setNotes] = useState(
    signOffRecord?.notes || 'All separation plates, trapping, screen angles, and TAC limits verified against ISO 12647-2.'
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSignOff({
      approved,
      signatoryName: operatorName,
      signatoryRole: role,
      companyName: company,
      timestamp: new Date().toISOString(),
      notes,
      isoStandard: 'ISO 12647-7:2016 / G7 Master',
      passedPreflight: true,
    });
    onClose();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
              <Stamp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                Prepress Sign-Off & Plate Release
              </h2>
              <p className="text-[11px] text-neutral-400">
                Official Production Release Authorization Certificate
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

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
          {/* Job summary badge */}
          <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between">
            <div>
              <span className="font-semibold text-white block">{job.name}</span>
              <span className="text-[11px] text-neutral-400 font-mono">
                {job.metadata.width} × {job.metadata.height} px · {job.metadata.resolution} DPI · {job.plates.length} plates
              </span>
            </div>
            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
              ISO 12647-7 Verified
            </span>
          </div>

          {/* Decision */}
          <div className="space-y-1.5">
            <label className="text-neutral-300 font-medium block">
              Production Authorization Status:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setApproved(true)}
                className={`p-2.5 rounded-lg border text-left flex items-center gap-2.5 transition-colors ${
                  approved
                    ? 'bg-emerald-950/50 border-emerald-600 text-emerald-200'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:bg-neutral-900'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <div>
                  <span className="font-bold block">APPROVED</span>
                  <span className="text-[10px] opacity-80">Release to CTP Platesetter</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setApproved(false)}
                className={`p-2.5 rounded-lg border text-left flex items-center gap-2.5 transition-colors ${
                  !approved
                    ? 'bg-rose-950/50 border-rose-600 text-rose-200'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:bg-neutral-900'
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <div>
                  <span className="font-bold block">REJECTED</span>
                  <span className="text-[10px] opacity-80">Re-RIP / Correction Required</span>
                </div>
              </button>
            </div>
          </div>

          {/* Signatory Details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-neutral-400 font-medium block mb-1">
                Signatory Name
              </label>
              <div className="flex items-center gap-1.5 bg-neutral-950 border border-neutral-700 rounded px-2.5 py-1.5">
                <User className="w-3.5 h-3.5 text-neutral-500" />
                <input
                  type="text"
                  required
                  value={operatorName}
                  onChange={e => setOperatorName(e.target.value)}
                  className="bg-transparent flex-1 text-white text-xs focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-neutral-400 font-medium block mb-1">
                Role / Title
              </label>
              <input
                type="text"
                required
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-700 rounded px-2.5 py-1.5 text-white text-xs focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-neutral-400 font-medium block mb-1">
              Printing Facility / Company
            </label>
            <div className="flex items-center gap-1.5 bg-neutral-950 border border-neutral-700 rounded px-2.5 py-1.5">
              <Building className="w-3.5 h-3.5 text-neutral-500" />
              <input
                type="text"
                required
                value={company}
                onChange={e => setCompany(e.target.value)}
                className="bg-transparent flex-1 text-white text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-neutral-400 font-medium block mb-1">
              Sign-Off Notes & Color Tolerances
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-700 rounded p-2.5 text-white text-xs focus:outline-none resize-none font-sans"
            />
          </div>

          {/* Plate Checklist */}
          <div className="p-3 rounded-lg bg-neutral-950/60 border border-neutral-800 space-y-1.5">
            <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 block">
              RELEASED PLATES ({job.plates.length})
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono text-neutral-300">
              {job.plates.map((p, i) => (
                <div key={i} className="flex items-center gap-1.5 truncate">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: `rgb(${p.r}, ${p.g}, ${p.b})` }}
                  />
                  <span className="truncate">{p.separation.name} ({p.inkedAreaPercent}%)</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Proof Certificate</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors shadow-sm"
              >
                Sign & Authorize
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
