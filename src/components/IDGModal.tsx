import React from 'react';
import { 
  X, 
  Sliders, 
  Sparkles, 
  CheckCircle, 
  Info,
  Activity,
  Layers
} from 'lucide-react';
import { ProofSettings } from '../types/prepress';

interface IDGModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ProofSettings;
  onUpdateSettings: (settings: Partial<ProofSettings>) => void;
}

export const IDGModal: React.FC<IDGModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-950 border border-purple-800 flex items-center justify-center text-purple-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                Hamillroad FirstPROOF™ IDG & Press Engine
              </h2>
              <p className="text-[11px] text-neutral-400">
                Inverse Dot Gain (IDG), Point Spread Function (PSF) & Yule-Nielsen TRC
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

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
          {/* Main Toggle */}
          <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between">
            <div>
              <span className="font-semibold text-white block">
                Enable Hamillroad IDG Press Simulation
              </span>
              <span className="text-[11px] text-neutral-400">
                Simulates optical photon scatter in paper fibers and ink squeeze under press cylinders.
              </span>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.inverseDotGainEnabled}
                onChange={e => onUpdateSettings({ inverseDotGainEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          {/* Substrate & Profile */}
          <div className="space-y-3 p-3.5 rounded-lg bg-neutral-950/60 border border-neutral-800">
            <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 block">
              SUBSTRATE & PRESS CONDITIONS
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-neutral-300 font-medium block mb-1">
                  Target Substrate
                </label>
                <select
                  value={settings.substrate}
                  onChange={e => onUpdateSettings({ substrate: e.target.value as ProofSettings['substrate'] })}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-white font-sans text-xs focus:outline-none focus:border-purple-500"
                >
                  <option value="Coated">Coated Commercial Paper (FOGRA39 / ISO 12647-2)</option>
                  <option value="Uncoated">Uncoated Woodfree (FOGRA47)</option>
                  <option value="Newsprint">Standard Coldset Newsprint</option>
                  <option value="Kraft">Brown Kraft Packaging Board</option>
                </select>
              </div>

              <div>
                <label className="text-neutral-300 font-medium block mb-1">
                  Screening Type
                </label>
                <select
                  value={settings.screeningType}
                  onChange={e => onUpdateSettings({ screeningType: e.target.value as ProofSettings['screeningType'] })}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-white font-sans text-xs focus:outline-none focus:border-purple-500"
                >
                  <option value="AM">AM Conventional Halftone (175 LPI Euclidean)</option>
                  <option value="FM">FM Stochastic (Hamillroad Auraia DMS)</option>
                  <option value="Hybrid">Hybrid AM/FM (Screen Spekta)</option>
                  <option value="HDS">High Definition Screening (HDS)</option>
                  <option value="Sublima">Agfa Sublima High Fidelity</option>
                </select>
              </div>
            </div>
          </div>

          {/* Optical Scatter & Mechanical Gain */}
          <div className="space-y-3.5 p-3.5 rounded-lg bg-neutral-950/60 border border-neutral-800">
            <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 block">
              POINT SPREAD FUNCTION (PSF) & TRC MODELING
            </span>

            {/* Nominal Dot Gain Curve */}
            <div>
              <div className="flex items-center justify-between text-neutral-300 mb-1">
                <span>Nominal Mechanical Dot Gain at 50%:</span>
                <span className="font-mono text-purple-400 font-bold">
                  +{settings.dotGainCurve}%
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={25}
                step={0.5}
                value={settings.dotGainCurve}
                onChange={e => onUpdateSettings({ dotGainCurve: Number(e.target.value) })}
                className="w-full accent-purple-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-neutral-500 font-mono mt-0.5">
                <span>+5% (Rigid Plate)</span>
                <span>+14% (Standard Offset)</span>
                <span>+25% (Flexo / Newsprint)</span>
              </div>
            </div>

            {/* Yule-Nielsen n-Factor */}
            <div>
              <div className="flex items-center justify-between text-neutral-300 mb-1">
                <span>Yule-Nielsen Optical Factor (n):</span>
                <span className="font-mono text-purple-400 font-bold">
                  {settings.yuleNielsenN.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={1.4}
                max={2.6}
                step={0.05}
                value={settings.yuleNielsenN}
                onChange={e => onUpdateSettings({ yuleNielsenN: Number(e.target.value) })}
                className="w-full accent-purple-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-neutral-500 font-mono mt-0.5">
                <span>1.4 (Pure Beer-Lambert)</span>
                <span>2.0 (Typical Coated)</span>
                <span>2.6 (High Substrate Scatter)</span>
              </div>
            </div>

            {/* Scatter Factor */}
            <div>
              <div className="flex items-center justify-between text-neutral-300 mb-1">
                <span>Optical Scatter Coefficient:</span>
                <span className="font-mono text-purple-400 font-bold">
                  {settings.idgScatterFactor.toFixed(2)}×
                </span>
              </div>
              <input
                type="range"
                min={0.5}
                max={2.0}
                step={0.05}
                value={settings.idgScatterFactor}
                onChange={e => onUpdateSettings({ idgScatterFactor: Number(e.target.value) })}
                className="w-full accent-purple-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Hamillroad Quality Scores */}
          <div className="p-3 rounded-lg bg-purple-950/30 border border-purple-800/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" />
              <div>
                <span className="font-semibold text-purple-200 block">
                  Simulated Spectral Uniformity Score
                </span>
                <span className="text-[10px] text-purple-400/80">
                  Hamillroad FirstPROOF Quality Index
                </span>
              </div>
            </div>
            <span className="font-mono font-black text-lg text-purple-300">
              94 / 100
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-800 bg-neutral-950 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs transition-colors"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
