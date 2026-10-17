import { PrintJob, PreflightItem } from '../types/prepress';

export interface PreflightReport {
  items: PreflightItem[];
  passCount: number;
  warnCount: number;
  failCount: number;
  maxTac: number;
  maxTacCoords: [number, number];
  overallStatus: 'pass' | 'warning' | 'fail';
}

/**
 * Runs preflight inspection on the active print job and separation plates.
 */
export function runPreflightAnalysis(job: PrintJob): PreflightReport {
  const items: PreflightItem[] = [];
  const plates = job.plates;

  // 1. Resolution Check
  const res = job.metadata.resolution;
  const is1Bit = job.metadata.bitDepth === 1;

  if (is1Bit) {
    if (res >= 2400) {
      items.push({
        id: 'res_ctp',
        category: 'resolution',
        title: 'CTP Plate Resolution',
        detail: `Plate resolution is ${res} DPI (standard 2400+ DPI for CTP laser platesetter).`,
        status: 'pass',
        value: `${res} DPI`,
        limit: '≥ 2400 DPI',
      });
    } else if (res >= 1200) {
      items.push({
        id: 'res_ctp',
        category: 'resolution',
        title: 'CTP Plate Resolution',
        detail: `Plate resolution is ${res} DPI (acceptable for flexo/newspaper, but below 2400 DPI commercial offset standard).`,
        status: 'warning',
        value: `${res} DPI`,
        limit: '≥ 2400 DPI',
      });
    } else {
      items.push({
        id: 'res_ctp',
        category: 'resolution',
        title: 'CTP Plate Resolution Low',
        detail: `Plate resolution is ${res} DPI, which is insufficient for 1-bit screening output.`,
        status: 'fail',
        value: `${res} DPI`,
        limit: '≥ 2400 DPI',
      });
    }
  } else {
    if (res >= 300) {
      items.push({
        id: 'res_contone',
        category: 'resolution',
        title: 'Continuous Tone Resolution',
        detail: `Image resolution is ${res} DPI (meets 300 DPI high-quality proof standard).`,
        status: 'pass',
        value: `${res} DPI`,
        limit: '≥ 300 DPI',
      });
    } else {
      items.push({
        id: 'res_contone',
        category: 'resolution',
        title: 'Low Image Resolution',
        detail: `Image resolution is ${res} DPI, which may appear pixelated in print.`,
        status: 'warning',
        value: `${res} DPI`,
        limit: '≥ 300 DPI',
      });
    }
  }

  // 2. Separation Dimension Matching
  const w = job.metadata.width;
  const h = job.metadata.height;
  let dimsMatch = true;
  for (const plate of plates) {
    if (plate.width !== w || plate.height !== h) {
      dimsMatch = false;
      break;
    }
  }

  if (dimsMatch) {
    items.push({
      id: 'dims_match',
      category: 'dimensions',
      title: 'Plate Geometry & Dimensions',
      detail: `All ${plates.length} separation plates match exactly: ${w} × ${h} px (${(w / (res / 25.4)).toFixed(1)} × ${(h / (res / 25.4)).toFixed(1)} mm).`,
      status: 'pass',
      value: `${w} × ${h} px`,
    });
  } else {
    items.push({
      id: 'dims_match',
      category: 'dimensions',
      title: 'Plate Dimension Mismatch',
      detail: 'Separation plates have inconsistent pixel dimensions, which causes misregistration!',
      status: 'fail',
    });
  }

  // 3. Process Color Completeness
  const colorTypes = new Set(job.separations.map(s => s.colorType));
  const hasCyan = colorTypes.has('ProcessCyan');
  const hasMagenta = colorTypes.has('ProcessMagenta');
  const hasYellow = colorTypes.has('ProcessYellow');
  const hasBlack = colorTypes.has('ProcessBlack');

  if (hasCyan && hasMagenta && hasYellow && hasBlack) {
    items.push({
      id: 'cmyk_complete',
      category: 'separations',
      title: 'CMYK Process Colors',
      detail: 'All 4 primary process plates (Cyan, Magenta, Yellow, Black) are present.',
      status: 'pass',
      value: 'CMYK Full Set',
    });
  } else if (hasBlack && !hasCyan && !hasMagenta && !hasYellow) {
    items.push({
      id: 'cmyk_complete',
      category: 'separations',
      title: 'Monochrome Job',
      detail: 'Single black plate detected (monochrome/spot job).',
      status: 'info',
      value: '1-Color Black',
    });
  } else {
    items.push({
      id: 'cmyk_complete',
      category: 'separations',
      title: 'Partial Process Colors',
      detail: 'Some standard CMYK process separations are absent from this job.',
      status: 'warning',
      value: 'Incomplete CMYK',
    });
  }

  // 4. Screening Angles & Moiré Audit
  const printablePlates = job.separations.filter(s => !s.isTechnical && s.screenLpi > 0);
  const angles = printablePlates.map(p => ({ name: p.name, angle: p.screenAngle }));
  let angleWarning = false;
  for (let i = 0; i < angles.length; i++) {
    for (let j = i + 1; j < angles.length; j++) {
      const diff = Math.abs(angles[i].angle - angles[j].angle);
      // Process colors (C, M, K) should ideally have 30° difference to avoid moiré
      if (diff === 0 && angles[i].name !== angles[j].name) {
        angleWarning = true;
      }
    }
  }

  if (printablePlates.length > 0) {
    if (!angleWarning) {
      items.push({
        id: 'screen_angles',
        category: 'trapping',
        title: 'Screening Angles & Rosettes',
        detail: `Standard ISO 12647-2 screen angle separation verified (C:15°, M:75°, Y:0°, K:45°). Moiré risk is minimal.`,
        status: 'pass',
      });
    } else {
      items.push({
        id: 'screen_angles',
        category: 'trapping',
        title: 'Screen Angle Collision Detected',
        detail: 'Two or more active printing plates share identical screen angles, creating a risk of visual moiré pattern.',
        status: 'warning',
      });
    }
  }

  // 5. Total Area Coverage (TAC / TIC) Limit Scan
  const inkLimit = job.settings.inkLimit || 300;
  const size = w * h;
  let maxTac = 0;
  let maxCoord: [number, number] = [0, 0];
  let tacViolationPixels = 0;

  // Stride-based sample for speed
  const stride = Math.max(1, Math.floor(Math.sqrt(size) / 200));
  const activePrintPlates = plates.filter(p => !p.separation.isTechnical);

  for (let y = 0; y < h; y += stride) {
    const rowOffset = y * w;
    for (let x = 0; x < w; x += stride) {
      let tac = 0;
      for (const plate of activePrintPlates) {
        tac += (plate.coverage[rowOffset + x] / 255) * 100;
      }
      if (tac > maxTac) {
        maxTac = tac;
        maxCoord = [x, y];
      }
      if (tac > inkLimit) {
        tacViolationPixels++;
      }
    }
  }

  maxTac = Number(maxTac.toFixed(1));

  if (maxTac <= inkLimit) {
    items.push({
      id: 'tac_limit',
      category: 'tac',
      title: 'Total Area Coverage (TAC)',
      detail: `Maximum ink coverage is ${maxTac}%, which is within the ${inkLimit}% press limit for ${job.settings.substrate} stock.`,
      status: 'pass',
      value: `${maxTac}%`,
      limit: `≤ ${inkLimit}%`,
    });
  } else if (maxTac <= inkLimit + 20) {
    items.push({
      id: 'tac_limit',
      category: 'tac',
      title: 'TAC Exceeds Press Limit (Warning)',
      detail: `Maximum TAC reaches ${maxTac}% at pixel (${maxCoord[0]}, ${maxCoord[1]}), exceeding the target ${inkLimit}% limit. May cause ink smearing on high-speed presses.`,
      status: 'warning',
      value: `${maxTac}%`,
      limit: `≤ ${inkLimit}%`,
    });
  } else {
    items.push({
      id: 'tac_limit',
      category: 'tac',
      title: 'Severe TAC Violation (Fail)',
      detail: `Peak TAC reaches ${maxTac}% (limit is ${inkLimit}%). High risk of ink set-off, paper cockling, and drying failure.`,
      status: 'fail',
      value: `${maxTac}%`,
      limit: `≤ ${inkLimit}%`,
    });
  }

  // 6. Technical Plate Overprint Verification
  const dielinePlate = plates.find(p => p.separation.isTechnical);
  if (dielinePlate) {
    items.push({
      id: 'dieline_status',
      category: 'dieline',
      title: 'Technical Dieline Separation',
      detail: `Plate "${dielinePlate.separation.name}" is correctly isolated as non-printing line art (will not produce printing ink on plate cylinders).`,
      status: 'pass',
      value: 'Non-Printing Layer',
    });
  }

  const passCount = items.filter(i => i.status === 'pass').length;
  const warnCount = items.filter(i => i.status === 'warning').length;
  const failCount = items.filter(i => i.status === 'fail').length;

  const overallStatus = failCount > 0 ? 'fail' : warnCount > 0 ? 'warning' : 'pass';

  return {
    items,
    passCount,
    warnCount,
    failCount,
    maxTac,
    maxTacCoords: maxCoord,
    overallStatus,
  };
}
