import React from 'react';
import { 
  Hand, 
  Pipette, 
  Ruler, 
  Search, 
  Move, 
  Layers, 
  Flame, 
  Film, 
  ZoomIn, 
  ZoomOut, 
  Maximize2,
  Eye,
  Sparkles,
  Scissors
} from 'lucide-react';
import { ViewerTool, PlateViewMode, ProofSettings } from '../types/prepress';

interface ToolBarProps {
  tool: ViewerTool;
  onSetTool: (tool: ViewerTool) => void;
  viewMode: PlateViewMode;
  onSetViewMode: (mode: PlateViewMode) => void;
  progressiveIndex: number;
  maxPlates: number;
  onSetProgressiveIndex: (idx: number) => void;
  aperture: number;
  onSetAperture: (aperture: number) => void;
  zoom: number;
  onSetZoom: (zoom: number) => void;
  onFitPage: () => void;
  settings: ProofSettings;
  onUpdateSettings: (settings: Partial<ProofSettings>) => void;
  showDieline: boolean;
  onToggleDieline: () => void;
}

export const ToolBar: React.FC<ToolBarProps> = ({
  tool,
  onSetTool,
  viewMode,
  onSetViewMode,
  progressiveIndex,
  maxPlates,
  onSetProgressiveIndex,
  aperture,
  onSetAperture,
  zoom,
  onSetZoom,
  onFitPage,
  settings,
  onUpdateSettings,
  showDieline,
  onToggleDieline,
}) => {
  return (
    <div className="h-11 border-b border-neutral-800 bg-neutral-900/60 backdrop-blur-md px-4 flex items-center justify-between text-xs text-neutral-300 select-none z-20">
      {/* Left: Tools Selection */}
      <div className="flex items-center gap-1">
        <div className="flex items-center bg-neutral-950 p-0.5 rounded-lg border border-neutral-800">
          <button
            onClick={() => onSetTool('pan')}
            title="Hand Pan Tool (H / Space)"
            className={`p-1.5 rounded-md flex items-center gap-1 transition-colors ${
              tool === 'pan'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <Hand className="w-4 h-4" />
          </button>

          <button
            onClick={() => onSetTool('densitometer')}
            title="Densitometer Crosshair (D)"
            className={`p-1.5 rounded-md flex items-center gap-1 transition-colors ${
              tool === 'densitometer'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <Pipette className="w-4 h-4" />
          </button>

          <button
            onClick={() => onSetTool('measure')}
            title="Caliper Ruler Tool (M)"
            className={`p-1.5 rounded-md flex items-center gap-1 transition-colors ${
              tool === 'measure'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <Ruler className="w-4 h-4" />
          </button>

          <button
            onClick={() => onSetTool('loupe')}
            title="1-Bit Dot Loupe Inspector (Z)"
            className={`p-1.5 rounded-md flex items-center gap-1 transition-colors ${
              tool === 'loupe'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            onClick={() => onSetTool('registration')}
            title="Plate Registration Shift (R)"
            className={`p-1.5 rounded-md flex items-center gap-1 transition-colors ${
              tool === 'registration'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <Move className="w-4 h-4" />
          </button>
        </div>

        {/* Aperture selector if Densitometer is active */}
        {tool === 'densitometer' && (
          <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-neutral-800">
            <span className="text-[11px] text-neutral-400">Aperture:</span>
            <div className="flex items-center gap-0.5 bg-neutral-950 p-0.5 rounded-md border border-neutral-800">
              {[1, 3, 5, 9, 15].map(sz => (
                <button
                  key={sz}
                  onClick={() => onSetAperture(sz)}
                  className={`px-1.5 py-0.5 text-[10px] font-mono rounded ${
                    aperture === sz
                      ? 'bg-cyan-600 text-white font-semibold'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {sz}×{sz}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Middle: View Mode Tabs */}
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-neutral-950 p-0.5 rounded-lg border border-neutral-800">
          <button
            onClick={() => onSetViewMode('composite')}
            className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors ${
              viewMode === 'composite'
                ? 'bg-neutral-800 text-cyan-400 font-medium shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Composite Proof</span>
          </button>

          <button
            onClick={() => onSetViewMode('progressive')}
            className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors ${
              viewMode === 'progressive'
                ? 'bg-neutral-800 text-amber-400 font-medium shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <span>Progressive Laydown</span>
          </button>

          <button
            onClick={() => onSetViewMode('film')}
            title="View plates as pure high-contrast 1-bit film"
            className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors ${
              viewMode === 'film'
                ? 'bg-neutral-800 text-white font-medium shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Film (B&W)</span>
          </button>

          <button
            onClick={() => onSetViewMode('tacHeatmap')}
            title="Total Area Coverage Heatmap (> 300% TAC highlighted)"
            className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors ${
              viewMode === 'tacHeatmap'
                ? 'bg-red-950/80 border border-red-700/80 text-red-300 font-medium shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-red-400" />
            <span>TAC Heatmap</span>
          </button>
        </div>

        {/* Progressive slider if progressive view active */}
        {viewMode === 'progressive' && (
          <div className="flex items-center gap-1.5 bg-neutral-950 px-2 py-1 rounded-md border border-neutral-800">
            <span className="text-[11px] text-neutral-400">Sequence:</span>
            <input
              type="range"
              min={1}
              max={maxPlates}
              value={progressiveIndex}
              onChange={e => onSetProgressiveIndex(Number(e.target.value))}
              className="w-20 accent-amber-500 h-1"
            />
            <span className="font-mono text-[11px] text-amber-400 font-medium">
              1–{progressiveIndex} of {maxPlates}
            </span>
          </div>
        )}
      </div>

      {/* Right: Substrate, Toggles & Zoom */}
      <div className="flex items-center gap-3">
        {/* Substrate Selector */}
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-neutral-400">Stock:</span>
          <select
            value={settings.substrate}
            onChange={e => onUpdateSettings({ substrate: e.target.value as ProofSettings['substrate'] })}
            className="bg-neutral-950 text-neutral-200 border border-neutral-800 rounded px-1.5 py-0.5 text-[11px] focus:outline-none focus:border-cyan-600"
          >
            <option value="Coated">Coated Offset (ISO 12647-2)</option>
            <option value="Uncoated">Uncoated Woodfree</option>
            <option value="Newsprint">Newsprint 45g</option>
            <option value="Kraft">Kraft Carton Board</option>
          </select>
        </div>

        {/* Dieline Toggle */}
        <button
          onClick={onToggleDieline}
          title="Toggle Technical Dieline Layer"
          className={`px-2 py-1 rounded flex items-center gap-1 border transition-colors ${
            showDieline
              ? 'bg-red-950/50 border-red-800 text-red-300'
              : 'bg-neutral-950 border-neutral-800 text-neutral-500'
          }`}
        >
          <Scissors className="w-3 h-3" />
          <span className="text-[11px]">Dieline</span>
        </button>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-neutral-950 px-1 py-0.5 rounded-lg border border-neutral-800">
          <button
            onClick={() => onSetZoom(Math.max(0.1, zoom * 0.75))}
            title="Zoom Out"
            className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-900"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <span 
            onClick={onFitPage}
            title="Click to Fit to Screen"
            className="font-mono text-[11px] text-neutral-200 px-1.5 cursor-pointer hover:text-cyan-400 font-medium min-w-[42px] text-center"
          >
            {Math.round(zoom * 100)}%
          </span>

          <button
            onClick={() => onSetZoom(Math.min(32.0, zoom * 1.33))}
            title="Zoom In (up to 3200% for 1-bit halftone dots)"
            className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-900"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onFitPage}
            title="Fit Page (F)"
            className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-900 border-l border-neutral-800 ml-0.5"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
