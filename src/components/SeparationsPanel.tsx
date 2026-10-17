import React, { useState } from 'react';
import { 
  Eye, 
  EyeOff, 
  Layers, 
  Download, 
  RotateCcw, 
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import { PrintJob, PlateLayer } from '../types/prepress';
import { exportPlateAs1BitTiff, downloadTiffFile } from '../services/tiffExporter';

interface SeparationsPanelProps {
  job: PrintJob;
  onUpdatePlate: (index: number, changes: Partial<PlateLayer>) => void;
  onBatchUpdatePlates: (updater: (plate: PlateLayer, index: number) => Partial<PlateLayer>) => void;
}

export const SeparationsPanel: React.FC<SeparationsPanelProps> = ({
  job,
  onUpdatePlate,
  onBatchUpdatePlates,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedPlateIdx, setExpandedPlateIdx] = useState<number | null>(null);

  const plates = job.plates;

  const handleExportPlate = (plate: PlateLayer) => {
    const tiffData = exportPlateAs1BitTiff(plate, job.metadata.resolution);
    const cleanName = plate.separation.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    downloadTiffFile(`${job.name}_${cleanName}_1Bit.tif`, tiffData);
  };

  const handleToggleSolo = (targetIdx: number) => {
    const isCurrentlySolo = plates[targetIdx].solo;
    onBatchUpdatePlates((_, idx) => ({
      solo: idx === targetIdx ? !isCurrentlySolo : false,
    }));
  };

  const handleResetRegistration = () => {
    onBatchUpdatePlates(() => ({ shiftX: 0, shiftY: 0 }));
  };

  const hasAnyShift = plates.some(p => p.shiftX !== 0 || p.shiftY !== 0);

  return (
    <aside className={`border-r border-neutral-800 bg-neutral-900/80 backdrop-blur-md flex flex-col transition-all duration-200 z-20 ${
      collapsed ? 'w-12' : 'w-80'
    }`}>
      {/* Panel Header */}
      <div className="h-11 px-3 border-b border-neutral-800 flex items-center justify-between text-xs font-semibold text-neutral-200">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Separations & Plates</span>
            <span className="font-mono text-[11px] bg-neutral-800 text-neutral-400 px-1.5 py-0.2 rounded-full">
              {plates.length}
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white ml-auto"
          title={collapsed ? 'Expand Separations Panel' : 'Collapse Panel'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Quick Batch Filter Actions */}
          <div className="px-3 py-2 border-b border-neutral-800 bg-neutral-950/40 flex items-center justify-between gap-1 text-[11px]">
            <div className="flex items-center gap-1">
              <button
                onClick={() => onBatchUpdatePlates(() => ({ visible: true, solo: false }))}
                className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
              >
                All On
              </button>
              <button
                onClick={() =>
                  onBatchUpdatePlates(p => ({
                    visible:
                      p.separation.colorType === 'ProcessCyan' ||
                      p.separation.colorType === 'ProcessMagenta' ||
                      p.separation.colorType === 'ProcessYellow' ||
                      p.separation.colorType === 'ProcessBlack',
                    solo: false,
                  }))
                }
                className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
              >
                CMYK Only
              </button>
            </div>

            {hasAnyShift && (
              <button
                onClick={handleResetRegistration}
                title="Reset all plate registration offsets to 0"
                className="px-2 py-0.5 rounded bg-rose-950/60 border border-rose-800/80 text-rose-300 flex items-center gap-1 hover:bg-rose-900"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Shift</span>
              </button>
            )}
          </div>

          {/* Plates Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-neutral-800/60 p-2 space-y-1.5">
            {plates.map((plate, idx) => {
              const sep = plate.separation;
              const isExpanded = expandedPlateIdx === idx;
              const swatchColor = `rgb(${plate.r}, ${plate.g}, ${plate.b})`;

              return (
                <div
                  key={sep.id || idx}
                  className={`rounded-lg border transition-all ${
                    plate.solo
                      ? 'bg-amber-950/30 border-amber-600/70 shadow-sm'
                      : !plate.visible
                      ? 'bg-neutral-950/40 border-neutral-800/60 opacity-60'
                      : 'bg-neutral-900/90 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  {/* Plate Card Header Row */}
                  <div className="p-2.5 flex items-center gap-2.5">
                    {/* Color Swatch Dot */}
                    <div
                      className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-sm border border-white/20"
                      style={{ backgroundColor: swatchColor }}
                      title={`Ink Color: rgb(${plate.r}, ${plate.g}, ${plate.b})`}
                    />

                    {/* Plate Name & Tags */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-neutral-100 truncate">
                          {sep.name}
                        </span>
                        {sep.isTechnical && (
                          <span className="text-[9px] uppercase font-mono px-1 py-0.2 rounded bg-rose-950 text-rose-400 border border-rose-800/50">
                            Technical
                          </span>
                        )}
                        {sep.isSpotColor && (
                          <span className="text-[9px] uppercase font-mono px-1 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800/50">
                            Spot
                          </span>
                        )}
                      </div>

                      {/* Coverage & Screen Specs */}
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-neutral-400 font-mono">
                        <span className="text-cyan-400 font-semibold">{plate.inkedAreaPercent}% ink</span>
                        <span>·</span>
                        {sep.screenLpi > 0 ? (
                          <span>{sep.screenAngle}° / {sep.screenLpi} lpi</span>
                        ) : (
                          <span>Solid / Line</span>
                        )}
                        <span>·</span>
                        <span>{plate.bitDepth === 1 ? '1-Bit' : '8-Bit'}</span>
                      </div>
                    </div>

                    {/* Interactive Action Buttons */}
                    <div className="flex items-center gap-1">
                      {/* Visibility Toggle */}
                      <button
                        onClick={() => onUpdatePlate(idx, { visible: !plate.visible })}
                        title={plate.visible ? 'Hide Plate' : 'Show Plate'}
                        className={`p-1 rounded hover:bg-neutral-800 transition-colors ${
                          plate.visible ? 'text-neutral-300' : 'text-neutral-600'
                        }`}
                      >
                        {plate.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>

                      {/* Solo Toggle */}
                      <button
                        onClick={() => handleToggleSolo(idx)}
                        title={plate.solo ? 'Cancel Solo' : 'Solo Plate'}
                        className={`w-5 h-5 rounded text-[10px] font-bold font-mono transition-colors flex items-center justify-center ${
                          plate.solo
                            ? 'bg-amber-500 text-neutral-950 font-black'
                            : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white'
                        }`}
                      >
                        S
                      </button>

                      {/* Invert Toggle */}
                      <button
                        onClick={() => onUpdatePlate(idx, { inverted: !plate.inverted })}
                        title={plate.inverted ? 'Inverted (Film Negative)' : 'Normal Positive'}
                        className={`w-5 h-5 rounded text-[10px] font-bold font-mono transition-colors flex items-center justify-center ${
                          plate.inverted
                            ? 'bg-cyan-500 text-neutral-950 font-black'
                            : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white'
                        }`}
                      >
                        I
                      </button>

                      {/* Expand Plate Settings */}
                      <button
                        onClick={() => setExpandedPlateIdx(isExpanded ? null : idx)}
                        title="Registration shift & TIFF export"
                        className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Micro Progress Bar of Inked Coverage */}
                  <div className="h-1 bg-neutral-950 rounded-b-lg overflow-hidden">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, plate.inkedAreaPercent)}%`,
                        backgroundColor: swatchColor,
                      }}
                    />
                  </div>

                  {/* Expanded Plate Settings (Registration & Export) */}
                  {isExpanded && (
                    <div className="p-3 border-t border-neutral-800/80 bg-neutral-950/50 space-y-2.5 text-xs">
                      <div>
                        <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1">
                          <span>Plate Registration Shift:</span>
                          <span className="font-mono text-cyan-400">
                            dx: {plate.shiftX}px, dy: {plate.shiftY}px
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center gap-1.5 bg-neutral-900 px-2 py-1 rounded border border-neutral-800">
                            <span className="text-[10px] text-neutral-500 font-mono">X:</span>
                            <input
                              type="range"
                              min={-20}
                              max={20}
                              value={plate.shiftX}
                              onChange={e => onUpdatePlate(idx, { shiftX: Number(e.target.value) })}
                              className="w-full accent-cyan-500 h-1"
                            />
                          </div>
                          <div className="flex items-center gap-1.5 bg-neutral-900 px-2 py-1 rounded border border-neutral-800">
                            <span className="text-[10px] text-neutral-500 font-mono">Y:</span>
                            <input
                              type="range"
                              min={-20}
                              max={20}
                              value={plate.shiftY}
                              onChange={e => onUpdatePlate(idx, { shiftY: Number(e.target.value) })}
                              className="w-full accent-cyan-500 h-1"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-neutral-800/50">
                        <span className="text-[10px] text-neutral-400 font-mono">
                          {plate.compressionName}
                        </span>
                        <button
                          onClick={() => handleExportPlate(plate)}
                          className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors"
                        >
                          <Download className="w-3 h-3 text-cyan-400" />
                          <span>Export .TIF</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </aside>
  );
};
