import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  ArrowRight,
  Download,
  Settings2,
  Trash2
} from 'lucide-react';
import { 
  ParsedTiffPlate, 
  parseTiffFile, 
  buildPrintJobFromPlates,
  PREPRESS_INK_COLORS 
} from '../services/tiffLoader';
import { PrintJob, SeparationColorType } from '../types/prepress';
import { exportPlateAs1BitTiff, downloadTiffFile } from '../services/tiffExporter';

interface TiffDropzoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobLoaded: (job: PrintJob) => void;
}

export const TiffDropzoneModal: React.FC<TiffDropzoneModalProps> = ({
  isOpen,
  onClose,
  onJobLoaded,
}) => {
  const [plates, setPlates] = useState<ParsedTiffPlate[]>([]);
  const [jobName, setJobName] = useState('Custom_TIFF_Job');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFiles = async (files: FileList | File[]) => {
    setIsProcessing(true);
    setErrorMsg(null);

    const newPlates: ParsedTiffPlate[] = [];
    const tiffFiles = Array.from(files).filter(f => 
      f.name.toLowerCase().endsWith('.tif') || f.name.toLowerCase().endsWith('.tiff')
    );

    if (tiffFiles.length === 0) {
      setErrorMsg('No .tif or .tiff files found. Please select valid TIFF separation files.');
      setIsProcessing(false);
      return;
    }

    try {
      for (const file of tiffFiles) {
        const parsed = await parseTiffFile(file);
        newPlates.push(...parsed);
      }

      setPlates(prev => [...prev, ...newPlates]);

      // Suggest clean job name from first file prefix
      if (tiffFiles[0]) {
        const baseName = tiffFiles[0].name.replace(/(_(c|m|y|k|cyan|magenta|yellow|black|gold|spot|die|varnish))?\.(tif|tiff)$/i, '');
        setJobName(baseName || 'Prepress_Job');
      }
    } catch (err) {
      setErrorMsg(`TIFF parsing error: ${(err as Error).message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleRemovePlate = (idx: number) => {
    setPlates(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpdatePlateColor = (idx: number, newColor: SeparationColorType) => {
    setPlates(prev => prev.map((p, i) => {
      if (i !== idx) return p;
      return {
        ...p,
        colorType: newColor,
        rgb: PREPRESS_INK_COLORS[newColor] || p.rgb,
      };
    }));
  };

  const handleFinishLoading = () => {
    if (plates.length === 0) return;
    try {
      const job = buildPrintJobFromPlates(jobName, plates, plates.map(p => p.fileName));
      onJobLoaded(job);
      onClose();
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  };

  // Check if plate dimensions match
  const dimMismatch = plates.length > 1 && plates.some(p => p.width !== plates[0].width || p.height !== plates[0].height);

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800/80 flex items-center justify-center text-cyan-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                Load Real TIFF Separation Plates
              </h2>
              <p className="text-[11px] text-neutral-400">
                1-Bit Bi-level CTP Plates (CCITT G4 / LZW / Uncompressed) & Multi-Channel TIFFs
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

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
          {/* Drag & Drop Zone */}
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-cyan-500 bg-cyan-950/20'
                : 'border-neutral-700/80 hover:border-neutral-500 bg-neutral-950/40 hover:bg-neutral-950/70'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".tif,.tiff"
              onChange={e => e.target.files && handleFiles(e.target.files)}
              className="hidden"
            />
            <Upload className="w-8 h-8 mx-auto text-cyan-400 mb-2 opacity-80" />
            <p className="font-semibold text-neutral-200 text-sm">
              Drag & drop .TIF / .TIFF separation plates here
            </p>
            <p className="text-[11px] text-neutral-400 mt-1">
              Supports 1-bit CTP plates (Cyan, Magenta, Yellow, Black, Spots) & multi-channel prepress files.
            </p>
            <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-neutral-500 font-mono">
              <span className="px-2 py-0.5 rounded bg-neutral-800">1-Bit Bi-level</span>
              <span className="px-2 py-0.5 rounded bg-neutral-800">CCITT Group 4</span>
              <span className="px-2 py-0.5 rounded bg-neutral-800">LZW / PackBits</span>
              <span className="px-2 py-0.5 rounded bg-neutral-800">2400 DPI CTP</span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-800 text-red-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {dimMismatch && (
            <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800 text-amber-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>Warning: Plates have differing pixel dimensions. Misregistration will occur.</span>
            </div>
          )}

          {/* Job Name Input */}
          {plates.length > 0 && (
            <div className="flex items-center gap-3 bg-neutral-950 p-3 rounded-lg border border-neutral-800">
              <span className="text-neutral-400 font-medium">Job Name:</span>
              <input
                type="text"
                value={jobName}
                onChange={e => setJobName(e.target.value)}
                className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1 text-white font-mono focus:outline-none focus:border-cyan-500 text-xs"
              />
              <span className="text-neutral-500 font-mono text-[11px]">
                {plates.length} plates ready
              </span>
            </div>
          )}

          {/* Detected Plates List */}
          {plates.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-neutral-400 font-mono text-[11px] px-1">
                <span>PARSED TIFF SEPARATIONS</span>
                <span>
                  {plates[0].originalWidth || plates[0].width} × {plates[0].originalHeight || plates[0].height} px · {plates[0].dpi} DPI
                  {plates[0].downsampleFactor > 1 && (
                    <span className="text-amber-400 ml-1.5 font-sans">(1:{plates[0].downsampleFactor} Smart Preview)</span>
                  )}
                </span>
              </div>

              <div className="border border-neutral-800 rounded-lg divide-y divide-neutral-800/80 overflow-hidden bg-neutral-950/50">
                {plates.map((p, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between gap-3 hover:bg-neutral-900/60 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0 border border-white/20"
                        style={{ backgroundColor: `rgb(${p.rgb[0]}, ${p.rgb[1]}, ${p.rgb[2]})` }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white truncate">
                            {p.separationName}
                          </span>
                          <span className="text-[10px] font-mono text-neutral-400">
                            ({p.fileName})
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-neutral-400 mt-0.5">
                          <span className="text-cyan-400">{p.bitDepth === 1 ? '1-Bit' : '8-Bit'}</span>
                          <span>·</span>
                          <span>{p.compressionName}</span>
                          <span>·</span>
                          <span>{p.originalWidth || p.width}×{p.originalHeight || p.height}</span>
                          <span>·</span>
                          <span>{p.screenAngle}°</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Color assignment selector */}
                      <select
                        value={p.colorType}
                        onChange={e => handleUpdatePlateColor(idx, e.target.value as SeparationColorType)}
                        className="bg-neutral-900 text-neutral-200 border border-neutral-700 rounded px-1.5 py-0.5 text-[11px] focus:outline-none"
                      >
                        <option value="ProcessCyan">Cyan</option>
                        <option value="ProcessMagenta">Magenta</option>
                        <option value="ProcessYellow">Yellow</option>
                        <option value="ProcessBlack">Black</option>
                        <option value="SpotColor">Spot Color</option>
                        <option value="Orange">Orange</option>
                        <option value="Green">Green</option>
                        <option value="Violet">Violet</option>
                        <option value="White">White</option>
                        <option value="Varnish">Varnish</option>
                        <option value="Red">Dieline</option>
                      </select>

                      <button
                        onClick={() => handleRemovePlate(idx)}
                        className="p-1 rounded hover:bg-neutral-800 text-neutral-500 hover:text-red-400 transition-colors"
                        title="Remove plate"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between">
          <div className="text-[11px] text-neutral-400">
            {plates.length === 0 ? 'No files selected' : `${plates.length} plates ready for soft proofing`}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-md hover:bg-neutral-800 text-neutral-300 font-medium text-xs transition-colors"
            >
              Cancel
            </button>

            <button
              disabled={plates.length === 0 || isProcessing}
              onClick={handleFinishLoading}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md font-semibold text-xs text-white transition-all shadow-sm ${
                plates.length === 0 || isProcessing
                  ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                  : 'bg-cyan-600 hover:bg-cyan-500 active:scale-[0.98]'
              }`}
            >
              <span>Load Plates into Viewer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
