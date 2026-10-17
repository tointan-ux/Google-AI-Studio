import React, { useState } from 'react';
import { 
  Pipette, 
  Ruler, 
  Flame, 
  AlertCircle, 
  CheckCircle, 
  ChevronRight, 
  ChevronLeft,
  Copy,
  Info
} from 'lucide-react';
import { DensitometerReading, CaliperMeasurement, PrintJob } from '../types/prepress';

interface DensitometerPanelProps {
  reading: DensitometerReading | null;
  caliper: CaliperMeasurement | null;
  job: PrintJob;
}

export const DensitometerPanel: React.FC<DensitometerPanelProps> = ({
  reading,
  caliper,
  job,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);

  const inkLimit = job.settings.inkLimit || 300;

  const handleCopyValues = () => {
    if (!reading) return;
    const text = `SoftProof Reading at (${reading.x}, ${reading.y}) | TAC: ${reading.totalAreaCoverage}%\n` +
      reading.perPlate.map(p => `${p.plateName}: ${p.dotAreaPercent}% (D: ${p.opticalDensity})`).join('\n') +
      `\nLab: [${reading.lab.join(', ')}]`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <aside className={`border-l border-neutral-800 bg-neutral-900/80 backdrop-blur-md flex flex-col transition-all duration-200 z-20 ${
      collapsed ? 'w-12' : 'w-76'
    }`}>
      {/* Panel Header */}
      <div className="h-11 px-3 border-b border-neutral-800 flex items-center justify-between text-xs font-semibold text-neutral-200">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white"
          title={collapsed ? 'Expand Inspection Panel' : 'Collapse Panel'}
        >
          {collapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {!collapsed && (
          <div className="flex items-center gap-2">
            <Pipette className="w-4 h-4 text-cyan-400" />
            <span>Densitometer & Metrics</span>
          </div>
        )}

        {!collapsed && reading && (
          <button
            onClick={handleCopyValues}
            title="Copy reading values to clipboard"
            className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
          {/* Caliper Section if active */}
          {caliper && (
            <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-800/40 space-y-2">
              <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-xs">
                <Ruler className="w-4 h-4" />
                <span>Caliper Measurement</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div>
                  <span className="text-neutral-500 block">Distance:</span>
                  <span className="text-amber-300 font-bold text-sm">
                    {caliper.distanceMm} mm
                  </span>
                  <span className="text-neutral-400 block text-[10px]">
                    ({caliper.distanceInches} in)
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Angle / Px:</span>
                  <span className="text-neutral-200 font-medium">
                    {caliper.angleDegrees}°
                  </span>
                  <span className="text-neutral-400 block text-[10px]">
                    {caliper.distancePixels} pixels
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block">ΔX:</span>
                  <span className="text-neutral-200">{caliper.deltaXMm} mm</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">ΔY:</span>
                  <span className="text-neutral-200">{caliper.deltaYMm} mm</span>
                </div>
              </div>
            </div>
          )}

          {/* Densitometer Spot Readout */}
          {reading ? (
            <div className="space-y-3.5">
              {/* Coordinates & Swatch */}
              <div className="p-3 rounded-lg bg-neutral-950/70 border border-neutral-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-neutral-500 font-mono uppercase block">
                    Sampling Aperture ({reading.aperture}×{reading.aperture} px)
                  </span>
                  <span className="font-mono text-sm font-semibold text-white">
                    X: {reading.x} px <span className="text-neutral-500 font-normal">({reading.xMm} mm)</span>
                  </span>
                  <span className="font-mono text-sm font-semibold text-white block">
                    Y: {reading.y} px <span className="text-neutral-500 font-normal">({reading.yMm} mm)</span>
                  </span>
                </div>

                {/* Simulated Spot Swatch */}
                <div className="flex flex-col items-center gap-1">
                  <div
                    className="w-10 h-10 rounded-md border border-white/20 shadow-inner"
                    style={{
                      backgroundColor: `rgb(${reading.rgbPreview[0]}, ${reading.rgbPreview[1]}, ${reading.rgbPreview[2]})`,
                    }}
                  />
                  <span className="font-mono text-[9px] text-neutral-400">
                    L*{reading.lab[0]}
                  </span>
                </div>
              </div>

              {/* Total Area Coverage (TAC / TIC) */}
              <div className={`p-3 rounded-lg border transition-all ${
                reading.tacWarning
                  ? 'bg-red-950/30 border-red-800/80 shadow-sm'
                  : reading.totalAreaCoverage > inkLimit - 20
                  ? 'bg-amber-950/30 border-amber-800/60'
                  : 'bg-neutral-950/50 border-neutral-800'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Flame className={`w-3.5 h-3.5 ${
                      reading.tacWarning ? 'text-red-400' : 'text-cyan-400'
                    }`} />
                    <span className="font-semibold text-neutral-200">
                      Total Area Coverage (TAC)
                    </span>
                  </div>
                  <span className={`font-mono text-sm font-bold ${
                    reading.tacWarning ? 'text-red-400' : 'text-cyan-300'
                  }`}>
                    {reading.totalAreaCoverage}%
                  </span>
                </div>

                {/* TAC Meter Bar */}
                <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden relative">
                  <div
                    className={`h-full transition-all duration-150 ${
                      reading.tacWarning
                        ? 'bg-red-500'
                        : reading.totalAreaCoverage > inkLimit - 20
                        ? 'bg-amber-500'
                        : 'bg-cyan-500'
                    }`}
                    style={{
                      width: `${Math.min(100, (reading.totalAreaCoverage / 360) * 100)}%`,
                    }}
                  />
                  {/* Press limit tick */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-400"
                    style={{ left: `${(inkLimit / 360) * 100}%` }}
                    title={`Press Limit: ${inkLimit}%`}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono mt-1">
                  <span>0%</span>
                  <span className="text-red-400">Limit: {inkLimit}%</span>
                  <span>360%</span>
                </div>

                {reading.tacWarning && (
                  <div className="mt-2 text-[11px] text-red-300 flex items-start gap-1 bg-red-950/50 p-1.5 rounded border border-red-800/60">
                    <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                    <span>Exceeds {inkLimit}% press limit! Risk of ink set-off & smudging.</span>
                  </div>
                )}
              </div>

              {/* Per-Plate Dot Area % and Optical Density */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 block px-1">
                  Plate Dot Area & Density (Status T)
                </span>

                <div className="space-y-1.5">
                  {reading.perPlate.map((p, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-md bg-neutral-950/60 border border-neutral-800/80 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor: `rgb(${p.rgb[0]}, ${p.rgb[1]}, ${p.rgb[2]})`,
                          }}
                        />
                        <span className="text-neutral-200 font-medium truncate max-w-[100px]" title={p.plateName}>
                          {p.plateName}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 font-mono text-[11px]">
                        <span className="text-white font-semibold min-w-[42px] text-right">
                          {p.dotAreaPercent}%
                        </span>
                        <span className="text-neutral-500 min-w-[40px] text-right text-[10px]">
                          {p.opticalDensity} D
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Colorimetry & Standards Reference */}
              <div className="p-2.5 rounded-lg bg-neutral-950/40 border border-neutral-800/50 text-[10px] text-neutral-400 font-mono space-y-1">
                <div className="flex justify-between">
                  <span>Standard:</span>
                  <span className="text-neutral-200">ISO 12647-7 / G7</span>
                </div>
                <div className="flex justify-between">
                  <span>Illuminant:</span>
                  <span className="text-neutral-200">D50 2° Observer</span>
                </div>
                <div className="flex justify-between">
                  <span>Delta E Target:</span>
                  <span className="text-emerald-400">ΔE00 ≤ 2.50</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-neutral-500 space-y-2">
              <Pipette className="w-8 h-8 mx-auto opacity-30 text-cyan-400" />
              <p className="text-xs">Hover over any plate area in the canvas to sample dot area coverage & density.</p>
              <p className="text-[10px] font-mono opacity-60">Press 'D' to activate densitometer crosshair.</p>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
