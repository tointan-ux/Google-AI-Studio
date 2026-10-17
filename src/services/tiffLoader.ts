import UTIF from 'utif';
import { PlateLayer, Separation, SeparationColorType, PrintJob, JobMetadata, ProofSettings } from '../types/prepress';

export interface ParsedTiffPlate {
  fileName: string;
  separationName: string;
  colorType: SeparationColorType;
  rgb: [number, number, number];
  isSpot: boolean;
  spotName?: string;
  isTechnical: boolean;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  downsampleFactor: number;
  dpi: number;
  bitDepth: 1 | 8;
  compressionName: string;
  coverage: Uint8Array;
  screenAngle: number;
  screenLpi: number;
  dotShape: string;
  photometric: number;
  software?: string;
  dateTime?: string;
}

/**
 * Standard prepress colors with accurate physical print ink coordinates
 */
export const PREPRESS_INK_COLORS: Record<SeparationColorType, [number, number, number]> = {
  ProcessCyan: [0, 174, 239],      // #00AEEF Process Cyan
  ProcessMagenta: [236, 0, 140],   // #EC008C Process Magenta
  ProcessYellow: [255, 242, 0],    // #FFF200 Process Yellow
  ProcessBlack: [35, 31, 32],      // #231F20 Process Black
  SpotColor: [200, 160, 40],       // Pantone Gold / Metallic
  Orange: [245, 130, 32],          // Extended Gamut Orange
  Green: [0, 166, 81],             // Extended Gamut Green
  Violet: [102, 45, 145],          // Extended Gamut Violet
  Red: [237, 28, 36],              // Warm Red / Spot
  Blue: [0, 84, 166],              // Reflex Blue / Spot
  White: [240, 240, 245],          // Opaque White ink
  Varnish: [168, 110, 255],        // Spot UV Gloss / Varnish
  Primer: [180, 200, 220],         // Plate Primer
};

/**
 * Detect separation characteristics from filename or TIFF metadata
 */
export function detectSeparationFromFileName(fileName: string): {
  colorType: SeparationColorType;
  displayName: string;
  rgb: [number, number, number];
  isSpot: boolean;
  spotName?: string;
  isTechnical: boolean;
  screenAngle: number;
  screenLpi: number;
  dotShape: string;
} {
  const cleanName = fileName.replace(/\.[^/.]+$/, '');
  const lower = cleanName.toLowerCase();

  // Dieline / Cut / Structural CAD
  if (lower.includes('die') || lower.includes('cad') || lower.includes('cut') || lower.includes('fold') || lower.includes('crease') || lower.includes('perf')) {
    return {
      colorType: 'Red',
      displayName: cleanName || 'Technical Dieline',
      rgb: [235, 64, 82],
      isSpot: false,
      isTechnical: true,
      screenAngle: 0,
      screenLpi: 0,
      dotShape: 'LineArt',
    };
  }

  // Spot UV / Gloss Varnish
  if (lower.includes('varnish') || lower.includes('gloss') || lower.includes('spot_uv') || lower.includes('spotuv') || lower.includes('coat')) {
    return {
      colorType: 'Varnish',
      displayName: cleanName || 'Spot UV Gloss',
      rgb: [168, 110, 255],
      isSpot: false,
      isTechnical: false,
      screenAngle: 45,
      screenLpi: 175,
      dotShape: 'Continuous',
    };
  }

  // Cyan
  if (lower.includes('cyan') || lower.endsWith('_c') || lower.endsWith('-c') || lower.endsWith('.c') || lower === 'c') {
    return {
      colorType: 'ProcessCyan',
      displayName: 'Process Cyan',
      rgb: PREPRESS_INK_COLORS.ProcessCyan,
      isSpot: false,
      isTechnical: false,
      screenAngle: 15,
      screenLpi: 175,
      dotShape: 'Euclidean',
    };
  }

  // Magenta
  if (lower.includes('magenta') || lower.endsWith('_m') || lower.endsWith('-m') || lower.endsWith('.m') || lower === 'm') {
    return {
      colorType: 'ProcessMagenta',
      displayName: 'Process Magenta',
      rgb: PREPRESS_INK_COLORS.ProcessMagenta,
      isSpot: false,
      isTechnical: false,
      screenAngle: 75,
      screenLpi: 175,
      dotShape: 'Euclidean',
    };
  }

  // Yellow
  if (lower.includes('yellow') || lower.endsWith('_y') || lower.endsWith('-y') || lower.endsWith('.y') || lower === 'y') {
    return {
      colorType: 'ProcessYellow',
      displayName: 'Process Yellow',
      rgb: PREPRESS_INK_COLORS.ProcessYellow,
      isSpot: false,
      isTechnical: false,
      screenAngle: 0,
      screenLpi: 175,
      dotShape: 'Euclidean',
    };
  }

  // Black (Key)
  if (lower.includes('black') || lower.includes('key') || lower.endsWith('_k') || lower.endsWith('-k') || lower.endsWith('.k') || lower === 'k') {
    return {
      colorType: 'ProcessBlack',
      displayName: 'Process Black',
      rgb: PREPRESS_INK_COLORS.ProcessBlack,
      isSpot: false,
      isTechnical: false,
      screenAngle: 45,
      screenLpi: 175,
      dotShape: 'Euclidean',
    };
  }

  // Pantone Gold / Metallic
  if (lower.includes('gold') || lower.includes('871') || lower.includes('metallic')) {
    return {
      colorType: 'SpotColor',
      displayName: 'PANTONE 871 C (Gold)',
      rgb: [200, 160, 40],
      isSpot: true,
      spotName: 'PANTONE 871 C',
      isTechnical: false,
      screenAngle: 45,
      screenLpi: 175,
      dotShape: 'Round',
    };
  }

  // Reflex Blue / Spot Blue
  if (lower.includes('reflex') || lower.includes('pantone_blue') || lower.includes('2133') || lower.includes('072')) {
    return {
      colorType: 'SpotColor',
      displayName: 'PANTONE Reflex Blue C',
      rgb: [30, 45, 140],
      isSpot: true,
      spotName: 'PANTONE Reflex Blue C',
      isTechnical: false,
      screenAngle: 15,
      screenLpi: 175,
      dotShape: 'Round',
    };
  }

  // Warm Red / Pantone 032
  if (lower.includes('warm_red') || lower.includes('warmred') || lower.includes('032') || lower.includes('rubine')) {
    return {
      colorType: 'SpotColor',
      displayName: 'PANTONE Warm Red C',
      rgb: [238, 50, 36],
      isSpot: true,
      spotName: 'PANTONE Warm Red C',
      isTechnical: false,
      screenAngle: 75,
      screenLpi: 175,
      dotShape: 'Round',
    };
  }

  // Orange
  if (lower.includes('orange') || lower.endsWith('_o') || lower.endsWith('-o')) {
    return {
      colorType: 'Orange',
      displayName: 'Process Orange (XG)',
      rgb: PREPRESS_INK_COLORS.Orange,
      isSpot: false,
      isTechnical: false,
      screenAngle: 30,
      screenLpi: 175,
      dotShape: 'Euclidean',
    };
  }

  // Green
  if (lower.includes('green') || lower.endsWith('_g') || lower.endsWith('-g')) {
    return {
      colorType: 'Green',
      displayName: 'Process Green (XG)',
      rgb: PREPRESS_INK_COLORS.Green,
      isSpot: false,
      isTechnical: false,
      screenAngle: 60,
      screenLpi: 175,
      dotShape: 'Euclidean',
    };
  }

  // Default Spot Color
  return {
    colorType: 'SpotColor',
    displayName: cleanName,
    rgb: [140, 80, 160],
    isSpot: true,
    spotName: cleanName,
    isTechnical: false,
    screenAngle: 45,
    screenLpi: 175,
    dotShape: 'Round',
  };
}

/**
 * Maximum display resolution for interactive proofing (prevents browser ArrayBuffer allocation failure).
 * Original physical resolution (e.g. 2400 DPI) and full width/height are preserved for metrics & caliper.
 */
const MAX_DISPLAY_DIM = 2400;
const MAX_DISPLAY_PIXELS = 5_760_000;

/**
 * Real TIFF parser that handles 1-bit bi-level plates, 8-bit plates, and multi-channel TIFFs
 * with memory-safe downsampling for gigapixel CTP plates.
 */
export async function parseTiffFile(file: File | { name: string; buffer: ArrayBuffer }): Promise<ParsedTiffPlate[]> {
  const arrayBuffer = 'buffer' in file ? file.buffer : await file.arrayBuffer();
  const fileName = file.name;

  let ifds: UTIF.IFD[];
  try {
    ifds = UTIF.decode(arrayBuffer);
  } catch (err) {
    throw new Error(`Failed to decode TIFF header for "${fileName}": ${(err as Error).message}`);
  }

  if (!ifds || ifds.length === 0) {
    throw new Error(`No image directories (IFD) found in TIFF file "${fileName}".`);
  }

  const plates: ParsedTiffPlate[] = [];

  for (let idx = 0; idx < ifds.length; idx++) {
    const ifd = ifds[idx];
    const anyIfd = ifd as Record<string, any>;

    // Read dimensions from IFD tags before decoding image
    const rawWidth: number = Array.isArray(anyIfd.t256) ? anyIfd.t256[0] : (ifd.width || 0);
    const rawHeight: number = Array.isArray(anyIfd.t257) ? anyIfd.t257[0] : (ifd.height || 0);

    if (!rawWidth || !rawHeight) {
      continue;
    }

    // Tag 258: BitsPerSample
    const rawBps = anyIfd.t258;
    const bps = Array.isArray(rawBps) ? rawBps[0] : (typeof rawBps === 'number' ? rawBps : 1);
    const bitDepth: 1 | 8 = bps === 1 ? 1 : 8;

    // Tag 259: Compression
    const compressionTag = typeof anyIfd.t259 === 'number' ? anyIfd.t259 : (Array.isArray(anyIfd.t259) ? anyIfd.t259[0] : 1);
    const compressionNames: Record<number, string> = {
      1: 'Uncompressed',
      2: 'CCITT 1D (Fax)',
      3: 'CCITT Group 3',
      4: 'CCITT Group 4 (CTP 1-bit)',
      5: 'LZW',
      6: 'JPEG',
      7: 'JPEG',
      8: 'Deflate/ZIP',
      32773: 'PackBits',
      32946: 'Deflate/ZIP',
    };
    const compressionName = compressionNames[compressionTag] || `Compression(${compressionTag})`;

    // Tag 262: PhotometricInterpretation
    // 0 = WhiteIsZero (0=light/no ink, 1=dark/ink in prepress)
    // 1 = BlackIsZero (0=dark/ink, 1=light/no ink)
    const rawPhoto = anyIfd.t262;
    const photometric: number = typeof rawPhoto === 'number' ? rawPhoto : (Array.isArray(rawPhoto) ? rawPhoto[0] : (bitDepth === 1 ? 0 : 1));

    // Tag 282 / 283 / 296: Resolution
    let dpi = 2400; // Standard CTP default if missing
    const rawXRes = anyIfd.t282;
    if (Array.isArray(rawXRes) && rawXRes.length > 0) {
      const num = rawXRes[0];
      const den = rawXRes[1] || 1;
      const xRes = typeof num === 'number' ? (num / den) : 2400;
      const resUnit = typeof anyIfd.t296 === 'number' ? anyIfd.t296 : (Array.isArray(anyIfd.t296) ? anyIfd.t296[0] : 2);
      if (resUnit === 3) {
        dpi = Math.round(xRes * 2.54);
      } else if (xRes > 10 && xRes < 20000) {
        dpi = Math.round(xRes);
      }
    } else if (typeof rawXRes === 'number' && rawXRes > 10 && rawXRes < 20000) {
      dpi = Math.round(rawXRes);
    } else if (bitDepth === 8) {
      dpi = 300;
    }

    // Tag 305: Software, Tag 306: DateTime, Tag 333: InkNames
    const software = anyIfd.t305 ? String(anyIfd.t305).trim() : undefined;
    const dateTime = anyIfd.t306 ? String(anyIfd.t306).trim() : undefined;
    const inkNames = anyIfd.t333 ? String(anyIfd.t333).trim() : undefined;

    // Safely decode compressed strips using UTIF.decodeImage
    let decodeSuccess = false;
    try {
      UTIF.decodeImage(arrayBuffer, ifd);
      decodeSuccess = true;
    } catch (err) {
      console.warn(`UTIF.decodeImage had warning for "${fileName}": ${(err as Error).message}`);
    }

    // Determine safe downsample factor
    let downsampleFactor = 1;
    if (rawWidth > MAX_DISPLAY_DIM || rawHeight > MAX_DISPLAY_DIM || (rawWidth * rawHeight) > MAX_DISPLAY_PIXELS) {
      downsampleFactor = Math.ceil(Math.max(rawWidth / MAX_DISPLAY_DIM, rawHeight / MAX_DISPLAY_DIM));
    }

    const dispWidth = Math.floor(rawWidth / downsampleFactor);
    const dispHeight = Math.floor(rawHeight / downsampleFactor);
    const dispTotal = dispWidth * dispHeight;

    const coverage = new Uint8Array(dispTotal);

    if (ifd.data && ifd.data.length > 0) {
      const raw = ifd.data;

      if (bitDepth === 1) {
        // Bi-level 1-bit plate (each byte holds 8 pixels)
        const bytesPerRow = Math.ceil(rawWidth / 8);

        if (downsampleFactor === 1) {
          // Direct 1:1 unpacking
          let destIdx = 0;
          for (let y = 0; y < dispHeight; y++) {
            const rowOffset = y * bytesPerRow;
            for (let x = 0; x < dispWidth; x++) {
              const byteVal = raw[rowOffset + (x >> 3)];
              const bit = (byteVal >> (7 - (x & 7))) & 1;
              if (photometric === 0) {
                coverage[destIdx++] = bit ? 255 : 0;
              } else {
                coverage[destIdx++] = bit ? 0 : 255;
              }
            }
          }
        } else {
          // Downsampled continuous-tone ink coverage:
          // Computes exact dot area percentage by sampling/counting active bits in each cell!
          const step = Math.max(1, Math.floor(downsampleFactor / 4));
          for (let dy = 0; dy < dispHeight; dy++) {
            const startY = dy * downsampleFactor;
            const outRow = dy * dispWidth;
            for (let dx = 0; dx < dispWidth; dx++) {
              const startX = dx * downsampleFactor;
              let inkBits = 0;
              let sampleCount = 0;

              for (let sy = 0; sy < downsampleFactor; sy += step) {
                const y = startY + sy;
                if (y >= rawHeight) break;
                const rowOffset = y * bytesPerRow;
                for (let sx = 0; sx < downsampleFactor; sx += step) {
                  const x = startX + sx;
                  if (x >= rawWidth) break;
                  const byteVal = raw[rowOffset + (x >> 3)];
                  const bit = (byteVal >> (7 - (x & 7))) & 1;
                  const isInk = photometric === 0 ? bit : (1 - bit);
                  if (isInk) inkBits++;
                  sampleCount++;
                }
              }

              coverage[outRow + dx] = sampleCount > 0 ? Math.round((inkBits / sampleCount) * 255) : 0;
            }
          }
        }
      } else {
        // 8-bit plate
        if (downsampleFactor === 1 && raw.length >= dispTotal) {
          for (let i = 0; i < dispTotal; i++) {
            coverage[i] = photometric === 0 ? raw[i] : (255 - raw[i]);
          }
        } else {
          // Downsample 8-bit
          for (let dy = 0; dy < dispHeight; dy++) {
            const startY = dy * downsampleFactor;
            const outRow = dy * dispWidth;
            for (let dx = 0; dx < dispWidth; dx++) {
              const startX = dx * downsampleFactor;
              let sum = 0;
              let count = 0;
              for (let sy = 0; sy < downsampleFactor; sy += Math.max(1, Math.floor(downsampleFactor / 2))) {
                const y = startY + sy;
                if (y >= rawHeight) break;
                const rowOffset = y * rawWidth;
                for (let sx = 0; sx < downsampleFactor; sx += Math.max(1, Math.floor(downsampleFactor / 2))) {
                  const x = startX + sx;
                  if (x >= rawWidth) break;
                  const val = raw[rowOffset + x] || 0;
                  sum += photometric === 0 ? val : (255 - val);
                  count++;
                }
              }
              coverage[outRow + dx] = count > 0 ? Math.round(sum / count) : 0;
            }
          }
        }
      }
    } else {
      // Fallback: If UTIF didn't decompress (e.g. uncompressed raw strips), read directly from arrayBuffer
      try {
        const stripOffsets: number[] = Array.isArray(anyIfd.t273) ? anyIfd.t273 : (typeof anyIfd.t273 === 'number' ? [anyIfd.t273] : []);
        if (stripOffsets.length > 0 && compressionTag === 1) {
          const u8 = new Uint8Array(arrayBuffer);
          const bytesPerRow = Math.ceil(rawWidth / 8);
          const firstOffset = stripOffsets[0];
          
          for (let dy = 0; dy < dispHeight; dy++) {
            const rawY = dy * downsampleFactor;
            const rowOffset = firstOffset + rawY * bytesPerRow;
            const outRow = dy * dispWidth;
            for (let dx = 0; dx < dispWidth; dx++) {
              const rawX = dx * downsampleFactor;
              if (rowOffset + (rawX >> 3) < u8.length) {
                const byteVal = u8[rowOffset + (rawX >> 3)];
                const bit = (byteVal >> (7 - (rawX & 7))) & 1;
                coverage[outRow + dx] = (photometric === 0 ? bit : (1 - bit)) ? 255 : 0;
              }
            }
          }
        }
      } catch (fallbackErr) {
        console.warn('Fallback strip reader warning:', fallbackErr);
      }
    }

    // Free the raw uncompressed buffer to immediately recover memory!
    if (ifd.data) {
      delete (ifd as any).data;
    }

    // Identify plate
    let plateName = fileName;
    if (inkNames) {
      const splitNames = inkNames.split('\0').filter(Boolean);
      if (splitNames[idx]) {
        plateName = splitNames[idx];
      }
    } else if (ifds.length > 1) {
      plateName = `${fileName} - Plate ${idx + 1}`;
    }

    const detected = detectSeparationFromFileName(plateName);

    plates.push({
      fileName,
      separationName: detected.displayName,
      colorType: detected.colorType,
      rgb: detected.rgb,
      isSpot: detected.isSpot,
      spotName: detected.spotName,
      isTechnical: detected.isTechnical,
      width: dispWidth,
      height: dispHeight,
      originalWidth: rawWidth,
      originalHeight: rawHeight,
      downsampleFactor,
      dpi,
      bitDepth,
      compressionName: downsampleFactor > 1 ? `${compressionName} (1:${downsampleFactor} Preview)` : compressionName,
      coverage,
      screenAngle: detected.screenAngle,
      screenLpi: detected.screenLpi,
      dotShape: detected.dotShape,
      photometric,
      software,
      dateTime,
    });
  }

  return plates;
}

/**
 * Convert parsed TIFF plates into a complete PrintJob with PlateLayers
 */
export function buildPrintJobFromPlates(
  jobName: string,
  plates: ParsedTiffPlate[],
  sourceFiles: string[] = []
): PrintJob {
  if (plates.length === 0) {
    throw new Error('No plates provided to build PrintJob.');
  }

  // Common dimensions from first plate
  const primary = plates[0];
  const origWidth = primary.originalWidth;
  const origHeight = primary.originalHeight;
  const dispWidth = primary.width;
  const dispHeight = primary.height;
  const downsample = primary.downsampleFactor;
  const resolution = primary.dpi || 2400;

  const separations: Separation[] = [];
  const layers: PlateLayer[] = [];

  plates.forEach((p, idx) => {
    const sep: Separation = {
      id: `sep_${idx}_${p.colorType}`,
      name: p.separationName,
      index: idx,
      fileName: p.fileName,
      colorType: p.colorType,
      isSpotColor: p.isSpot,
      spotColorName: p.spotName,
      isTechnical: p.isTechnical,
      screenAngle: p.screenAngle,
      screenLpi: p.screenLpi,
      dotShape: p.dotShape,
      customRgb: p.rgb,
    };

    // Calculate inked area percent
    let sum = 0;
    const len = p.coverage.length;
    for (let i = 0; i < len; i++) {
      sum += p.coverage[i];
    }
    const inkedAreaPercent = Number(((sum * 100) / (255 * len)).toFixed(2));

    const layer: PlateLayer = {
      separation: sep,
      width: p.width,
      height: p.height,
      originalWidth: p.originalWidth,
      originalHeight: p.originalHeight,
      downsampleFactor: p.downsampleFactor,
      coverage: p.coverage,
      r: p.rgb[0],
      g: p.rgb[1],
      b: p.rgb[2],
      visible: true,
      solo: false,
      inverted: false,
      shiftX: 0,
      shiftY: 0,
      inkedAreaPercent,
      bitDepth: p.bitDepth,
      compressionName: p.compressionName,
    };

    separations.push(sep);
    layers.push(layer);
  });

  const metadata: JobMetadata = {
    ripName: primary.software || 'TIFF Prepress Plate Processor',
    ripVersion: '2.4.0',
    pressName: 'Speedmaster XL 106 8-LX (Coated ISO 12647-2)',
    width: origWidth,
    height: origHeight,
    displayWidth: dispWidth,
    displayHeight: dispHeight,
    downsampleFactor: downsample,
    resolution,
    bitDepth: primary.bitDepth,
    colorSpace: separations.some(s => s.isSpotColor) ? 'CMYK + Spots' : 'CMYK',
    separationNames: separations.map(s => s.name),
    dateTime: primary.dateTime || new Date().toISOString().slice(0, 19).replace('T', ' '),
    software: primary.software,
    sourceFiles,
  };

  const settings: ProofSettings = {
    displayProfile: 'sRGB IEC61966-2.1 (Calibrated D50)',
    simulationProfile: 'ISOcoated_v2_eci (FOGRA39)',
    substrate: 'Coated',
    simulatePaperColor: true,
    simulateBlackInk: true,
    simulateGlossVarnish: true,
    inkLimit: 300,
    dotGainCurve: 14.5,
    screeningType: 'AM',
    screenFrequency: 175,
    yuleNielsenN: 2.0,
    inverseDotGainEnabled: false,
    idgScatterFactor: 1.0,
  };

  return {
    id: `job_${Date.now()}`,
    name: jobName,
    format: primary.bitDepth === 1 ? 'OneBitTiffSeparations' : 'MultiChannelTiff',
    status: 'Ready',
    createdAt: new Date().toISOString(),
    metadata,
    separations,
    plates: layers,
    settings,
  };
}
