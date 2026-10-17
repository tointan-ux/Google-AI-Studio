import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  PrintJob, 
  PlateLayer, 
  ViewerTool, 
  PlateViewMode, 
  DensitometerReading, 
  CaliperMeasurement 
} from '../types/prepress';

interface PlateViewerCanvasProps {
  job: PrintJob;
  tool: ViewerTool;
  viewMode: PlateViewMode;
  progressiveIndex: number;
  aperture: number;
  zoom: number;
  onZoomChange: (newZoom: number) => void;
  showDieline: boolean;
  onDensitometerUpdate: (reading: DensitometerReading | null) => void;
  onCaliperUpdate: (measurement: CaliperMeasurement | null) => void;
}

export const PlateViewerCanvas: React.FC<PlateViewerCanvasProps> = ({
  job,
  tool,
  viewMode,
  progressiveIndex,
  aperture,
  zoom,
  onZoomChange,
  showDieline,
  onDensitometerUpdate,
  onCaliperUpdate,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loupeCanvasRef = useRef<HTMLCanvasElement>(null);

  // Pan offset in screen pixels
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Cursor in plate image coordinates
  const [plateCursor, setPlateCursor] = useState<{ x: number; y: number } | null>(null);
  const [screenCursor, setScreenCursor] = useState<{ x: number; y: number } | null>(null);

  // Caliper state
  const [caliperStart, setCaliperStart] = useState<{ x: number; y: number } | null>(null);
  const [caliperCurrent, setCaliperCurrent] = useState<{ x: number; y: number } | null>(null);
  const [isMeasuring, setIsMeasuring] = useState(false);

  // Pre-rendered offscreen buffer of the current job composite
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTimeoutRef = useRef<number | null>(null);

  const primaryPlate = job.plates[0];
  const width = primaryPlate ? primaryPlate.width : (job.metadata.displayWidth || 1200);
  const height = primaryPlate ? primaryPlate.height : (job.metadata.displayHeight || 900);
  const downsample = primaryPlate?.downsampleFactor || job.metadata.downsampleFactor || 1;
  const rawWidth = job.metadata.width || width;
  const rawHeight = job.metadata.height || height;
  const resolution = job.metadata.resolution;
  const pixelsPerMm = resolution / 25.4;

  // Center initial view
  useEffect(() => {
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      const initialPanX = (clientWidth - width * zoom) / 2;
      const initialPanY = (clientHeight - height * zoom) / 2;
      setPan({ x: initialPanX, y: initialPanY });
    }
  }, [width, height]);

  /**
   * Render the offscreen composite image of all active plates
   */
  const renderCompositeBuffer = useCallback(() => {
    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
    }
    const offCanvas = offscreenCanvasRef.current;
    if (offCanvas.width !== width || offCanvas.height !== height) {
      offCanvas.width = width;
      offCanvas.height = height;
    }

    const ctx = offCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;
    const totalPixels = width * height;

    // Substrate paper background
    const substrate = job.settings.substrate;
    let paperR = 250, paperG = 250, paperB = 252;
    if (substrate === 'Uncoated') { paperR = 240; paperG = 239; paperB = 234; }
    else if (substrate === 'Newsprint') { paperR = 234; paperG = 227; paperB = 210; }
    else if (substrate === 'Kraft') { paperR = 196; paperG = 164; paperB = 130; }

    // Check if any plate is solo
    const soloPlate = job.plates.find(p => p.solo);
    let activePlates = job.plates.filter(p => p.visible);

    if (soloPlate) {
      activePlates = [soloPlate];
    } else if (viewMode === 'progressive') {
      activePlates = activePlates.slice(0, progressiveIndex);
    }

    const dielinePlate = job.plates.find(p => p.separation.isTechnical);
    const varnishPlate = job.plates.find(p => p.separation.colorType === 'Varnish');
    const inkLimit = job.settings.inkLimit || 300;

    // Fast subtractive ink compositing loop
    for (let i = 0; i < totalPixels; i++) {
      const px = i % width;
      const py = Math.floor(i / width);
      const outIdx = i * 4;

      if (viewMode === 'tacHeatmap') {
        // Calculate TAC sum
        let tac = 0;
        for (const plate of activePlates) {
          if (!plate.separation.isTechnical && plate.separation.colorType !== 'Varnish') {
            const shiftPx = Math.min(width - 1, Math.max(0, px - plate.shiftX));
            const shiftPy = Math.min(height - 1, Math.max(0, py - plate.shiftY));
            const cov = plate.coverage[shiftPy * width + shiftPx];
            tac += (cov / 255) * 100;
          }
        }

        if (tac > inkLimit) {
          // Heatmap: over-ink warning in vibrant magenta/red glow
          data[outIdx] = 255;
          data[outIdx + 1] = 0;
          data[outIdx + 2] = 90;
          data[outIdx + 3] = 255;
        } else if (tac > inkLimit - 20) {
          // Warning zone (amber)
          data[outIdx] = 255;
          data[outIdx + 1] = 140;
          data[outIdx + 2] = 0;
          data[outIdx + 3] = 255;
        } else {
          // Safe density in cool blue-gray
          const norm = Math.min(1.0, tac / inkLimit);
          const gray = Math.round(240 - norm * 180);
          data[outIdx] = gray;
          data[outIdx + 1] = gray + 10;
          data[outIdx + 2] = gray + 20;
          data[outIdx + 3] = 255;
        }
      } else if (viewMode === 'film') {
        // Black & White Film mode (1-bit / high contrast plate view)
        let maxInk = 0;
        for (const plate of activePlates) {
          const shiftPx = Math.min(width - 1, Math.max(0, px - plate.shiftX));
          const shiftPy = Math.min(height - 1, Math.max(0, py - plate.shiftY));
          let cov = plate.coverage[shiftPy * width + shiftPx];
          if (plate.inverted) cov = 255 - cov;
          if (cov > maxInk) maxInk = cov;
        }
        // White paper (255) minus black film ink (maxInk)
        const v = 255 - maxInk;
        data[outIdx] = v;
        data[outIdx + 1] = v;
        data[outIdx + 2] = v;
        data[outIdx + 3] = 255;
      } else {
        // Standard Composite Prepress Proofing Mode
        let curR = paperR / 255;
        let curG = paperG / 255;
        let curB = paperB / 255;

        for (const plate of activePlates) {
          if (plate.separation.isTechnical) continue; // Dieline rendered separately
          if (plate.separation.colorType === 'Varnish') continue; // Varnish handled after

          const shiftPx = Math.min(width - 1, Math.max(0, px - plate.shiftX));
          const shiftPy = Math.min(height - 1, Math.max(0, py - plate.shiftY));
          let cov = plate.coverage[shiftPy * width + shiftPx] / 255;
          if (plate.inverted) cov = 1.0 - cov;

          if (cov > 0.001) {
            // Subtractive ink multiplication
            const inkR = plate.r / 255;
            const inkG = plate.g / 255;
            const inkB = plate.b / 255;

            // Transmittance of ink film
            curR *= (1.0 - cov * (1.0 - inkR));
            curG *= (1.0 - cov * (1.0 - inkG));
            curB *= (1.0 - cov * (1.0 - inkB));
          }
        }

        // Spot UV Gloss Varnish Simulation (sheen reflection)
        if (varnishPlate && varnishPlate.visible && !soloPlate) {
          const vCov = varnishPlate.coverage[i] / 255;
          if (vCov > 0.05) {
            // Specular gloss lift
            const glossLift = vCov * 0.15;
            curR = Math.min(1.0, curR + glossLift);
            curG = Math.min(1.0, curG + glossLift);
            curB = Math.min(1.0, curB + glossLift * 1.1); // subtle violet/cool sheen
          }
        }

        data[outIdx] = Math.round(curR * 255);
        data[outIdx + 1] = Math.round(curG * 255);
        data[outIdx + 2] = Math.round(curB * 255);
        data[outIdx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // Overlay Technical Dieline if enabled
    if (showDieline && dielinePlate && dielinePlate.visible && viewMode !== 'film' && viewMode !== 'tacHeatmap') {
      const dieData = dielinePlate.coverage;
      const overlayImg = ctx.getImageData(0, 0, width, height);
      const oData = overlayImg.data;

      for (let i = 0; i < totalPixels; i++) {
        if (dieData[i] > 120) {
          const outIdx = i * 4;
          // Crisp vector dieline in vibrant technical red/magenta (#EB4052)
          oData[outIdx] = 235;
          oData[outIdx + 1] = 64;
          oData[outIdx + 2] = 82;
          oData[outIdx + 3] = 255;
        }
      }
      ctx.putImageData(overlayImg, 0, 0);
    }
  }, [job, viewMode, progressiveIndex, showDieline, width, height]);

  // Debounced re-render of composite buffer when plates or settings change
  useEffect(() => {
    renderCompositeBuffer();
    drawMainCanvas();
  }, [renderCompositeBuffer]);

  /**
   * Main Viewport Draw
   */
  const drawMainCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Dark prepress neutral surroundings (D50 gray 24-28)
    ctx.fillStyle = '#14171a';
    ctx.fillRect(0, 0, w, h);

    // Draw Subtle Grid
    ctx.strokeStyle = '#1e2329';
    ctx.lineWidth = 1;
    const gridSize = Math.round(40 * Math.max(0.5, Math.min(2.0, zoom)));
    ctx.beginPath();
    for (let x = (pan.x % gridSize); x < w; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = (pan.y % gridSize); y < h; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();

    // Draw Plate Image
    if (offscreenCanvasRef.current) {
      ctx.save();
      // Use pixelated crisp nearest-neighbor when zoomed past 150% (for 1-bit halftone inspection)
      ctx.imageSmoothingEnabled = zoom <= 1.5;
      if (zoom > 1.5) {
        ctx.imageSmoothingQuality = 'low';
      }

      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);

      // Plate Drop Shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 24 / zoom;
      ctx.shadowOffsetX = 4 / zoom;
      ctx.shadowOffsetY = 6 / zoom;

      ctx.drawImage(offscreenCanvasRef.current, 0, 0);
      ctx.restore();
    }

    // Plate Outer Border
    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(pan.x, pan.y, width * zoom, height * zoom);
    ctx.restore();

    // Densitometer Crosshair & Aperture Overlay
    if (plateCursor && tool === 'densitometer') {
      const sx = pan.x + plateCursor.x * zoom;
      const sy = pan.y + plateCursor.y * zoom;
      const halfAp = (aperture / 2) * zoom;

      ctx.save();
      // Aperture boundary
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(sx - halfAp, sy - halfAp, aperture * zoom, aperture * zoom);

      // Crosshair lines
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.75)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, h);
      ctx.moveTo(0, sy);
      ctx.lineTo(w, sy);
      ctx.stroke();

      // Center point
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Caliper Ruler Overlay
    if (caliperStart && caliperCurrent) {
      const sx1 = pan.x + caliperStart.x * zoom;
      const sy1 = pan.y + caliperStart.y * zoom;
      const sx2 = pan.x + caliperCurrent.x * zoom;
      const sy2 = pan.y + caliperCurrent.y * zoom;

      ctx.save();
      // Dimension Line
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx1, sy1);
      ctx.lineTo(sx2, sy2);
      ctx.stroke();

      // End T-bars
      const angle = Math.atan2(sy2 - sy1, sx2 - sx1);
      const perp = angle + Math.PI / 2;
      const tLen = 8;

      ctx.beginPath();
      ctx.moveTo(sx1 + Math.cos(perp) * tLen, sy1 + Math.sin(perp) * tLen);
      ctx.lineTo(sx1 - Math.cos(perp) * tLen, sy1 - Math.sin(perp) * tLen);
      ctx.moveTo(sx2 + Math.cos(perp) * tLen, sy2 + Math.sin(perp) * tLen);
      ctx.lineTo(sx2 - Math.cos(perp) * tLen, sy2 - Math.sin(perp) * tLen);
      ctx.stroke();

      // Measurement Label
      const midX = (sx1 + sx2) / 2;
      const midY = (sy1 + sy2) / 2;
      const distPx = Math.sqrt((caliperCurrent.x - caliperStart.x) ** 2 + (caliperCurrent.y - caliperStart.y) ** 2);
      const distMm = (distPx * downsample) / pixelsPerMm;
      const label = `${distMm.toFixed(2)} mm (${(distMm / 25.4).toFixed(3)} in)`;

      ctx.font = '600 11px JetBrains Mono, monospace';
      const textW = ctx.measureText(label).width;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.fillRect(midX - textW / 2 - 6, midY - 18, textW + 12, 22);
      ctx.strokeRect(midX - textW / 2 - 6, midY - 18, textW + 12, 22);

      ctx.fillStyle = '#fbbf24';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, midX, midY - 7);
      ctx.restore();
    }
  }, [pan, zoom, width, height, plateCursor, tool, aperture, caliperStart, caliperCurrent, pixelsPerMm]);

  // Sync canvas resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
        drawMainCanvas();
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawMainCanvas]);

  useEffect(() => {
    drawMainCanvas();
  }, [drawMainCanvas]);

  /**
   * Sample Densitometer at plate coordinates
   */
  const sampleDensitometer = useCallback((px: number, py: number) => {
    if (px < 0 || px >= width || py < 0 || py >= height) {
      onDensitometerUpdate(null);
      return;
    }

    const half = Math.floor(aperture / 2);
    let totalTac = 0;

    const perPlate = job.plates.map(plate => {
      let sum = 0;
      let count = 0;

      const shiftPx = Math.min(width - 1, Math.max(0, px - plate.shiftX));
      const shiftPy = Math.min(height - 1, Math.max(0, py - plate.shiftY));

      for (let dy = -half; dy <= half; dy++) {
        const sy = shiftPy + dy;
        if (sy < 0 || sy >= height) continue;
        const row = sy * width;

        for (let dx = -half; dx <= half; dx++) {
          const sx = shiftPx + dx;
          if (sx < 0 || sx >= width) continue;
          let val = plate.coverage[row + sx];
          if (plate.inverted) val = 255 - val;
          sum += val;
          count++;
        }
      }

      const avg = count > 0 ? sum / count : 0;
      const dotAreaPercent = Number(((avg / 255) * 100).toFixed(1));

      // Calculate optical density D = -log10(1 - DotArea)
      const trans = Math.max(0.001, 1 - avg / 255);
      const opticalDensity = Number((-Math.log10(trans)).toFixed(2));

      if (!plate.separation.isTechnical && plate.separation.colorType !== 'Varnish') {
        totalTac += dotAreaPercent;
      }

      return {
        plateName: plate.separation.name,
        colorType: plate.separation.colorType,
        rgb: [plate.r, plate.g, plate.b] as [number, number, number],
        dotAreaPercent,
        opticalDensity,
        visible: plate.visible,
      };
    });

    totalTac = Number(totalTac.toFixed(1));

    // Sample RGB swatch from offscreen buffer
    let sampledR = 255, sampledG = 255, sampledB = 255;
    if (offscreenCanvasRef.current) {
      const ctx = offscreenCanvasRef.current.getContext('2d');
      if (ctx) {
        const p = ctx.getImageData(px, py, 1, 1).data;
        sampledR = p[0];
        sampledG = p[1];
        sampledB = p[2];
      }
    }

    // Convert sRGB to rough Lab for DeltaE verification
    const rN = sampledR / 255, gN = sampledG / 255, bN = sampledB / 255;
    const lStar = Math.round((0.2126 * rN + 0.7152 * gN + 0.0722 * bN) * 100);
    const aStar = Math.round((rN - gN) * 100);
    const bStar = Math.round((gN - bN) * 100);

    const origX = px * downsample;
    const origY = py * downsample;

    onDensitometerUpdate({
      x: origX,
      y: origY,
      xMm: Number((origX / pixelsPerMm).toFixed(2)),
      yMm: Number((origY / pixelsPerMm).toFixed(2)),
      aperture,
      perPlate,
      totalAreaCoverage: totalTac,
      tacWarning: totalTac > (job.settings.inkLimit || 300),
      lab: [lStar, aStar, bStar],
      rgbPreview: [sampledR, sampledG, sampledB],
    });
  }, [width, height, aperture, job.plates, job.settings.inkLimit, pixelsPerMm, downsample, onDensitometerUpdate]);

  /**
   * Update 1-Bit Loupe canvas
   */
  const updateLoupe = useCallback((px: number, py: number) => {
    const loupe = loupeCanvasRef.current;
    if (!loupe || !offscreenCanvasRef.current) return;
    const ctx = loupe.getContext('2d');
    if (!ctx) return;

    const loupeSize = 180;
    const mag = 16; // 16x zoom for halftone dots
    const srcSize = Math.round(loupeSize / mag);

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, loupeSize, loupeSize);

    ctx.imageSmoothingEnabled = false; // Nearest-neighbor crisp pixels

    const sx = Math.max(0, Math.min(width - srcSize, px - Math.floor(srcSize / 2)));
    const sy = Math.max(0, Math.min(height - srcSize, py - Math.floor(srcSize / 2)));

    ctx.drawImage(offscreenCanvasRef.current, sx, sy, srcSize, srcSize, 0, 0, loupeSize, loupeSize);

    // Crosshair in center of loupe
    ctx.strokeStyle = 'rgba(236, 72, 153, 0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(loupeSize / 2, 0);
    ctx.lineTo(loupeSize / 2, loupeSize);
    ctx.moveTo(0, loupeSize / 2);
    ctx.lineTo(loupeSize, loupeSize / 2);
    ctx.stroke();

    // Center pixel indicator
    ctx.strokeRect(loupeSize / 2 - mag / 2, loupeSize / 2 - mag / 2, mag, mag);
  }, [width, height]);

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const imgX = Math.floor((mouseX - pan.x) / zoom);
    const imgY = Math.floor((mouseY - pan.y) / zoom);

    if (e.button === 1 || tool === 'pan' || e.buttons === 4 || e.altKey) {
      // Pan
      setIsDragging(true);
      dragStartRef.current = { x: mouseX, y: mouseY };
      panStartRef.current = { ...pan };
    } else if (tool === 'measure') {
      // Start Caliper
      setIsMeasuring(true);
      setCaliperStart({ x: imgX, y: imgY });
      setCaliperCurrent({ x: imgX, y: imgY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setScreenCursor({ x: mouseX, y: mouseY });

    if (isDragging) {
      const dx = mouseX - dragStartRef.current.x;
      const dy = mouseY - dragStartRef.current.y;
      setPan({
        x: panStartRef.current.x + dx,
        y: panStartRef.current.y + dy,
      });
      return;
    }

    const imgX = Math.floor((mouseX - pan.x) / zoom);
    const imgY = Math.floor((mouseY - pan.y) / zoom);

    if (imgX >= 0 && imgX < width && imgY >= 0 && imgY < height) {
      setPlateCursor({ x: imgX * downsample, y: imgY * downsample });
      sampleDensitometer(imgX, imgY);

      if (tool === 'loupe') {
        updateLoupe(imgX, imgY);
      }
    } else {
      setPlateCursor(null);
      onDensitometerUpdate(null);
    }

    if (isMeasuring && caliperStart) {
      setCaliperCurrent({ x: imgX, y: imgY });

      const dX = (imgX - caliperStart.x) * downsample;
      const dY = (imgY - caliperStart.y) * downsample;
      const distPx = Math.sqrt(dX * dX + dY * dY);
      const distMm = distPx / pixelsPerMm;
      const angle = (Math.atan2(dY, dX) * 180) / Math.PI;

      onCaliperUpdate({
        startX: caliperStart.x * downsample,
        startY: caliperStart.y * downsample,
        endX: imgX * downsample,
        endY: imgY * downsample,
        deltaXPixels: dX,
        deltaYPixels: dY,
        deltaXMm: Number((dX / pixelsPerMm).toFixed(2)),
        deltaYMm: Number((dY / pixelsPerMm).toFixed(2)),
        distancePixels: Math.round(distPx),
        distanceMm: Number(distMm.toFixed(2)),
        distanceInches: Number((distMm / 25.4).toFixed(3)),
        angleDegrees: Number(angle.toFixed(1)),
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsMeasuring(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const factor = e.deltaY < 0 ? 1.2 : 0.833;
    const newZoom = Math.max(0.05, Math.min(32.0, zoom * factor));

    // Anchor zoom around cursor position
    const newPanX = mouseX - (mouseX - pan.x) * (newZoom / zoom);
    const newPanY = mouseY - (mouseY - pan.y) * (newZoom / zoom);

    setPan({ x: newPanX, y: newPanY });
    onZoomChange(newZoom);
  };

  return (
    <div
      ref={containerRef}
      className="relative flex-1 h-full w-full overflow-hidden bg-neutral-950 cursor-default select-none"
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setIsDragging(false);
          setPlateCursor(null);
          onDensitometerUpdate(null);
        }}
        onWheel={handleWheel}
        className={`w-full h-full block ${
          tool === 'pan' || isDragging ? 'cursor-grab active:cursor-grabbing' :
          tool === 'densitometer' || tool === 'measure' ? 'cursor-crosshair' :
          tool === 'loupe' ? 'cursor-zoom-in' : 'cursor-default'
        }`}
      />

      {/* Picture-in-Picture 1-Bit Halftone Loupe */}
      {tool === 'loupe' && plateCursor && screenCursor && (
        <div
          className="pointer-events-none absolute w-[190px] h-[190px] rounded-xl border-2 border-purple-500 shadow-2xl bg-neutral-950/90 overflow-hidden flex flex-col z-30"
          style={{
            left: Math.min(window.innerWidth - 220, screenCursor.x + 20),
            top: Math.min(window.innerHeight - 240, screenCursor.y + 20),
          }}
        >
          <div className="bg-purple-950/80 px-2 py-1 flex items-center justify-between text-[10px] font-mono text-purple-200 border-b border-purple-800">
            <span>16× Halftone Loupe</span>
            <span>{plateCursor.x}, {plateCursor.y}</span>
          </div>
          <canvas
            ref={loupeCanvasRef}
            width={180}
            height={160}
            className="w-full flex-1 block"
          />
        </div>
      )}

      {/* Viewport Status Pill (Floating Bottom Left) */}
      <div className="absolute bottom-3 left-3 bg-neutral-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-neutral-800 text-[11px] font-mono text-neutral-300 flex items-center gap-3 shadow-lg pointer-events-none z-10">
        <span className="text-neutral-400">
          X: <strong className="text-white">{plateCursor ? plateCursor.x : '--'}</strong> px (
          {plateCursor ? (plateCursor.x / pixelsPerMm).toFixed(1) : '--'} mm)
        </span>
        <span className="text-neutral-600">|</span>
        <span className="text-neutral-400">
          Y: <strong className="text-white">{plateCursor ? plateCursor.y : '--'}</strong> px (
          {plateCursor ? (plateCursor.y / pixelsPerMm).toFixed(1) : '--'} mm)
        </span>
        <span className="text-neutral-600">|</span>
        <span className="text-cyan-400 font-semibold">{Math.round(zoom * 100)}% Zoom</span>
        {downsample > 1 && (
          <>
            <span className="text-neutral-600">|</span>
            <span className="text-amber-400 font-medium bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/40">
              1:{downsample} Smart Preview (2400 DPI Native)
            </span>
          </>
        )}
      </div>
    </div>
  );
};
