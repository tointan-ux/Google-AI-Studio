import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  PrintJob, 
  PlateLayer, 
  ViewerTool, 
  PlateViewMode, 
  ProofSettings, 
  DensitometerReading, 
  CaliperMeasurement,
  SignOffRecord
} from './types/prepress';
import { generateDemoJob, DemoJobType } from './services/demoJobGenerator';
import { runPreflightAnalysis } from './services/preflightService';
import { exportPlateAs1BitTiff, downloadTiffFile } from './services/tiffExporter';
import { HeaderBar } from './components/HeaderBar';
import { ToolBar } from './components/ToolBar';
import { PlateViewerCanvas } from './components/PlateViewerCanvas';
import { SeparationsPanel } from './components/SeparationsPanel';
import { DensitometerPanel } from './components/DensitometerPanel';
import { TiffDropzoneModal } from './components/TiffDropzoneModal';
import { PreflightModal } from './components/PreflightModal';
import { IDGModal } from './components/IDGModal';
import { SignOffModal } from './components/SignOffModal';

export default function App() {
  // Current active PrintJob
  const [job, setJob] = useState<PrintJob>(() => generateDemoJob('carton'));

  // Viewer state
  const [tool, setTool] = useState<ViewerTool>('select');
  const [viewMode, setViewMode] = useState<PlateViewMode>('composite');
  const [progressiveIndex, setProgressiveIndex] = useState<number>(() => job.plates.length);
  const [aperture, setAperture] = useState<number>(3);
  const [zoom, setZoom] = useState<number>(1.0);
  const [showDieline, setShowDieline] = useState<boolean>(true);

  // Readouts
  const [densitometerReading, setDensitometerReading] = useState<DensitometerReading | null>(null);
  const [caliperMeasurement, setCaliperMeasurement] = useState<CaliperMeasurement | null>(null);

  // Modals
  const [tiffLoaderOpen, setTiffLoaderOpen] = useState(false);
  const [preflightOpen, setPreflightOpen] = useState(false);
  const [idgModalOpen, setIdgModalOpen] = useState(false);
  const [signOffOpen, setSignOffOpen] = useState(false);

  // Sign-off status
  const [signOffRecord, setSignOffRecord] = useState<SignOffRecord | null>(null);

  // Preflight Report
  const preflightReport = useMemo(() => {
    return runPreflightAnalysis(job);
  }, [job]);

  const preflightSummary = useMemo(() => {
    return {
      pass: preflightReport.passCount,
      warn: preflightReport.warnCount,
      fail: preflightReport.failCount,
    };
  }, [preflightReport]);

  // Adjust progressive max when plates change
  useEffect(() => {
    setProgressiveIndex(job.plates.length);
  }, [job.plates.length]);

  // Zoom Fit to container
  const handleFitPage = useCallback(() => {
    const container = document.getElementById('canvas-container');
    if (container && job.metadata.width > 0 && job.metadata.height > 0) {
      const padding = 60;
      const scaleX = (container.clientWidth - padding) / job.metadata.width;
      const scaleY = (container.clientHeight - padding) / job.metadata.height;
      const fitZoom = Math.max(0.1, Math.min(scaleX, scaleY, 2.0));
      setZoom(Number(fitZoom.toFixed(2)));
    } else {
      setZoom(1.0);
    }
  }, [job.metadata.width, job.metadata.height]);

  // Initial fit on load
  useEffect(() => {
    handleFitPage();
  }, [job.id, handleFitPage]);

  // Plate updates
  const handleUpdatePlate = (index: number, changes: Partial<PlateLayer>) => {
    setJob(prev => {
      const newPlates = [...prev.plates];
      newPlates[index] = { ...newPlates[index], ...changes };
      return {
        ...prev,
        plates: newPlates,
      };
    });
  };

  const handleBatchUpdatePlates = (updater: (plate: PlateLayer, index: number) => Partial<PlateLayer>) => {
    setJob(prev => {
      const newPlates = prev.plates.map((plate, idx) => ({
        ...plate,
        ...updater(plate, idx),
      }));
      return {
        ...prev,
        plates: newPlates,
      };
    });
  };

  const handleUpdateSettings = (changes: Partial<ProofSettings>) => {
    setJob(prev => ({
      ...prev,
      settings: { ...prev.settings, ...changes },
    }));
  };

  const handleSelectDemoJob = (type: DemoJobType) => {
    const newJob = generateDemoJob(type);
    setJob(newJob);
    setDensitometerReading(null);
    setCaliperMeasurement(null);
  };

  const handleJobLoadedFromTiff = (newJob: PrintJob) => {
    setJob(newJob);
    setDensitometerReading(null);
    setCaliperMeasurement(null);
    handleFitPage();
  };

  const handleExportCurrentPlate = () => {
    // Export first visible or solo plate
    const targetPlate = job.plates.find(p => p.solo) || job.plates.find(p => p.visible) || job.plates[0];
    if (targetPlate) {
      const tiffData = exportPlateAs1BitTiff(targetPlate, job.metadata.resolution);
      const cleanName = targetPlate.separation.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      downloadTiffFile(`${job.name}_${cleanName}_1Bit.tif`, tiffData);
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'h':
        case ' ':
          setTool('pan');
          break;
        case 'd':
          setTool('densitometer');
          break;
        case 'm':
          setTool('measure');
          break;
        case 'z':
          setTool('loupe');
          break;
        case 'r':
          setTool('registration');
          break;
        case 'f':
          handleFitPage();
          break;
        case '1':
          setViewMode('composite');
          break;
        case '2':
          setViewMode('progressive');
          break;
        case '3':
          setViewMode('film');
          break;
        case '4':
          setViewMode('tacHeatmap');
          break;
        case 'escape':
          setTiffLoaderOpen(false);
          setPreflightOpen(false);
          setIdgModalOpen(false);
          setSignOffOpen(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFitPage]);

  return (
    <div className="h-screen w-screen flex flex-col bg-neutral-950 text-neutral-100 overflow-hidden font-sans select-none">
      {/* Top Header */}
      <HeaderBar
        job={job}
        jobStatus={job.status}
        onOpenTiffLoader={() => setTiffLoaderOpen(true)}
        onSelectDemoJob={handleSelectDemoJob}
        onExportCurrentPlate={handleExportCurrentPlate}
        onOpenPreflight={() => setPreflightOpen(true)}
        onOpenIdgSettings={() => setIdgModalOpen(true)}
        onOpenSignOff={() => setSignOffOpen(true)}
        preflightSummary={preflightSummary}
      />

      {/* Main Prepress ToolBar */}
      <ToolBar
        tool={tool}
        onSetTool={setTool}
        viewMode={viewMode}
        onSetViewMode={setViewMode}
        progressiveIndex={progressiveIndex}
        maxPlates={job.plates.length}
        onSetProgressiveIndex={setProgressiveIndex}
        aperture={aperture}
        onSetAperture={setAperture}
        zoom={zoom}
        onSetZoom={setZoom}
        onFitPage={handleFitPage}
        settings={job.settings}
        onUpdateSettings={handleUpdateSettings}
        showDieline={showDieline}
        onToggleDieline={() => setShowDieline(!showDieline)}
      />

      {/* Center Workspace: Separations List + Canvas Viewer + Densitometer Inspector */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: Separations & Plates Panel */}
        <SeparationsPanel
          job={job}
          onUpdatePlate={handleUpdatePlate}
          onBatchUpdatePlates={handleBatchUpdatePlates}
        />

        {/* Center: Canvas Viewport */}
        <div id="canvas-container" className="flex-1 h-full w-full relative overflow-hidden flex">
          <PlateViewerCanvas
            job={job}
            tool={tool}
            viewMode={viewMode}
            progressiveIndex={progressiveIndex}
            aperture={aperture}
            zoom={zoom}
            onZoomChange={setZoom}
            showDieline={showDieline}
            onDensitometerUpdate={setDensitometerReading}
            onCaliperUpdate={setCaliperMeasurement}
          />
        </div>

        {/* Right: Densitometer & Metric Inspector */}
        <DensitometerPanel
          reading={densitometerReading}
          caliper={caliperMeasurement}
          job={job}
        />
      </div>

      {/* Modal Dialogs */}
      <TiffDropzoneModal
        isOpen={tiffLoaderOpen}
        onClose={() => setTiffLoaderOpen(false)}
        onJobLoaded={handleJobLoadedFromTiff}
      />

      <PreflightModal
        isOpen={preflightOpen}
        onClose={() => setPreflightOpen(false)}
        report={preflightReport}
        job={job}
      />

      <IDGModal
        isOpen={idgModalOpen}
        onClose={() => setIdgModalOpen(false)}
        settings={job.settings}
        onUpdateSettings={handleUpdateSettings}
      />

      <SignOffModal
        isOpen={signOffOpen}
        onClose={() => setSignOffOpen(false)}
        job={job}
        signOffRecord={signOffRecord}
        onSaveSignOff={setSignOffRecord}
      />
    </div>
  );
}
