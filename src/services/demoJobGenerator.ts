import { PrintJob, Separation, PlateLayer, ProofSettings, JobMetadata } from '../types/prepress';
import { PREPRESS_INK_COLORS } from './tiffLoader';

export type DemoJobType = 'carton' | 'halftone' | 'stochastic' | 'label';

/**
 * Creates high-fidelity sample prepress jobs complete with genuine raster coverage arrays.
 */
export function generateDemoJob(type: DemoJobType = 'carton'): PrintJob {
  switch (type) {
    case 'halftone':
      return createHalftoneAmJob();
    case 'stochastic':
      return createStochasticFmJob();
    case 'label':
      return createBeverageLabelJob();
    case 'carton':
    default:
      return createFoldingCartonJob();
  }
}

/**
 * Job 1: Folding Carton Packaging (CMYK + Gold + Spot UV + Dieline)
 * Dimensions: 1200 x 900 (standard folding carton flat)
 */
function createFoldingCartonJob(): PrintJob {
  const width = 1200;
  const height = 900;
  const dpi = 300;
  const size = width * height;

  const cyan = new Uint8Array(size);
  const magenta = new Uint8Array(size);
  const yellow = new Uint8Array(size);
  const black = new Uint8Array(size);
  const gold = new Uint8Array(size);
  const gloss = new Uint8Array(size);
  const dieline = new Uint8Array(size);

  // 1. Dieline layout (Carton outline, flaps, creases)
  // Outer perimeter
  const margin = 40;
  const panelW = 260;
  const panelH = 500;
  const topY = 200;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;

      // Outer border / cut line (solid red 255)
      const isOuterCut =
        (x === margin || x === width - margin) && y >= topY && y <= topY + panelH;
      const isTopCut = (y === topY || y === topY + panelH) && x >= margin && x <= width - margin;
      
      // Flaps / dust flaps
      const isFlapLeft = (y === topY - 120 || y === topY + panelH + 120) && x >= margin + 60 && x <= margin + panelW * 2;
      const isFoldLine =
        (x === margin + panelW || x === margin + panelW * 2 || x === margin + panelW * 3 || x === margin + panelW * 4) &&
        y >= topY && y <= topY + panelH;

      if (isOuterCut || isTopCut || isFlapLeft) {
        dieline[idx] = 255;
      } else if (isFoldLine && (y % 8 < 4)) {
        // Dashed crease line
        dieline[idx] = 255;
      }

      // 2. Front Panel Artwork (Panel 2: x = margin + panelW .. margin + panelW*2)
      if (x >= margin + panelW + 20 && x <= margin + panelW * 2 - 20 && y >= topY + 40 && y <= topY + panelH - 40) {
        // Hero Image / Photo panel
        const relX = (x - (margin + panelW + 20)) / (panelW - 40);
        const relY = (y - (topY + 40)) / (panelH - 80);

        // Rich Photographic Rose / Flower gradient
        const dist = Math.sqrt((relX - 0.5) ** 2 + (relY - 0.4) ** 2);
        if (dist < 0.38) {
          const factor = Math.max(0, 1 - dist / 0.38);
          magenta[idx] = Math.min(255, Math.round(factor * 240 + Math.sin(relX * 12) * 20));
          yellow[idx] = Math.min(255, Math.round(factor * 210));
          cyan[idx] = Math.min(255, Math.round(factor * 40));
          black[idx] = Math.min(255, Math.round(dist > 0.3 ? factor * 120 : 10));

          // Spot UV Gloss on the hero image
          gloss[idx] = 230;
        }

        // Luxury Title Banner in PANTONE 871 Gold
        if (relY >= 0.72 && relY <= 0.86) {
          gold[idx] = 240;
          gloss[idx] = 255; // UV over Gold
          if (relY >= 0.77 && relY <= 0.81 && relX >= 0.2 && relX <= 0.8) {
            // Knockout text in gold
            black[idx] = 255; // sharp typography
          }
        }
      }

      // 3. Side Panel (Panel 3: Barcode, Nutrition / Specs)
      if (x >= margin + panelW * 2 + 30 && x <= margin + panelW * 3 - 30 && y >= topY + 60 && y <= topY + panelH - 60) {
        // Barcode area
        if (y >= topY + 320 && y <= topY + 400 && x >= margin + panelW * 2 + 50 && x <= margin + panelW * 2 + 210) {
          const barStep = (x - (margin + panelW * 2 + 50)) % 10;
          if (barStep < 5 || (x % 7 === 0)) {
            black[idx] = 255; // 100% black barcode bars
          }
        }

        // Body text lines
        if (y >= topY + 80 && y <= topY + 280) {
          if ((y % 16 >= 4) && (y % 16 <= 7) && (x % 3 !== 0)) {
            black[idx] = 210;
            cyan[idx] = 30;
          }
        }
      }

      // 4. Panel 1 (Back Panel: Brand Color Gradient)
      if (x >= margin + 20 && x <= margin + panelW - 20 && y >= topY + 40 && y <= topY + panelH - 40) {
        const normY = (y - topY - 40) / (panelH - 80);
        cyan[idx] = Math.round(normY * 180 + 30);
        magenta[idx] = Math.round((1 - normY) * 120 + 20);
        yellow[idx] = 40;
      }

      // 5. Prepress Color Bars and Register Marks (at top and bottom margin)
      if (y >= topY - 70 && y <= topY - 50) {
        const patchW = 40;
        const patchIdx = Math.floor((x - 100) / patchW);
        if (patchIdx >= 0 && patchIdx < 16) {
          const ramp = ((patchIdx % 4) + 1) * 63;
          if (patchIdx < 4) cyan[idx] = ramp;
          else if (patchIdx < 8) magenta[idx] = ramp;
          else if (patchIdx < 12) yellow[idx] = ramp;
          else black[idx] = ramp;
        }
      }
    }
  }

  const separations: Separation[] = [
    {
      id: 'sep_c',
      name: 'Process Cyan',
      index: 0,
      fileName: 'Carton_Cyan.tif',
      colorType: 'ProcessCyan',
      isSpotColor: false,
      isTechnical: false,
      screenAngle: 15,
      screenLpi: 175,
      dotShape: 'Euclidean',
      customRgb: PREPRESS_INK_COLORS.ProcessCyan,
    },
    {
      id: 'sep_m',
      name: 'Process Magenta',
      index: 1,
      fileName: 'Carton_Magenta.tif',
      colorType: 'ProcessMagenta',
      isSpotColor: false,
      isTechnical: false,
      screenAngle: 75,
      screenLpi: 175,
      dotShape: 'Euclidean',
      customRgb: PREPRESS_INK_COLORS.ProcessMagenta,
    },
    {
      id: 'sep_y',
      name: 'Process Yellow',
      index: 2,
      fileName: 'Carton_Yellow.tif',
      colorType: 'ProcessYellow',
      isSpotColor: false,
      isTechnical: false,
      screenAngle: 0,
      screenLpi: 175,
      dotShape: 'Euclidean',
      customRgb: PREPRESS_INK_COLORS.ProcessYellow,
    },
    {
      id: 'sep_k',
      name: 'Process Black',
      index: 3,
      fileName: 'Carton_Black.tif',
      colorType: 'ProcessBlack',
      isSpotColor: false,
      isTechnical: false,
      screenAngle: 45,
      screenLpi: 175,
      dotShape: 'Euclidean',
      customRgb: PREPRESS_INK_COLORS.ProcessBlack,
    },
    {
      id: 'sep_gold',
      name: 'PANTONE 871 C (Gold)',
      index: 4,
      fileName: 'Carton_Pantone871Gold.tif',
      colorType: 'SpotColor',
      isSpotColor: true,
      spotColorName: 'PANTONE 871 C',
      isTechnical: false,
      screenAngle: 45,
      screenLpi: 175,
      dotShape: 'Round',
      customRgb: [200, 160, 40],
    },
    {
      id: 'sep_gloss',
      name: 'Spot UV Varnish',
      index: 5,
      fileName: 'Carton_SpotUV.tif',
      colorType: 'Varnish',
      isSpotColor: false,
      isTechnical: false,
      screenAngle: 45,
      screenLpi: 175,
      dotShape: 'Solid',
      customRgb: [168, 110, 255],
    },
    {
      id: 'sep_die',
      name: 'Technical Dieline',
      index: 6,
      fileName: 'Carton_Dieline.tif',
      colorType: 'Red',
      isSpotColor: false,
      isTechnical: true,
      screenAngle: 0,
      screenLpi: 0,
      dotShape: 'Vector',
      customRgb: [235, 64, 82],
    },
  ];

  const rawArrays = [cyan, magenta, yellow, black, gold, gloss, dieline];

  const plates: PlateLayer[] = separations.map((sep, idx) => {
    const raw = rawArrays[idx];
    let sum = 0;
    for (let i = 0; i < size; i++) sum += raw[i];
    const inkedAreaPercent = Number(((sum * 100) / (255 * size)).toFixed(2));

    return {
      separation: sep,
      width,
      height,
      coverage: raw,
      r: sep.customRgb![0],
      g: sep.customRgb![1],
      b: sep.customRgb![2],
      visible: true,
      solo: false,
      inverted: false,
      shiftX: 0,
      shiftY: 0,
      inkedAreaPercent,
      bitDepth: 8,
      compressionName: 'LZW',
      originalWidth: width,
      originalHeight: height,
      downsampleFactor: 1,
    };
  });

  const metadata: JobMetadata = {
    ripName: 'Harlequin MultiRIP v13.2r1',
    ripVersion: '13.2r1-p4',
    pressName: 'Heidelberg Speedmaster XL 106 6-LX',
    width,
    height,
    displayWidth: width,
    displayHeight: height,
    downsampleFactor: 1,
    resolution: dpi,
    bitDepth: 8,
    colorSpace: 'CMYK + Spots',
    separationNames: separations.map(s => s.name),
    dateTime: '2026-10-15 14:22:10',
    software: 'SoftProof TIFF Engine',
    sourceFiles: separations.map(s => s.fileName),
  };

  const settings: ProofSettings = {
    displayProfile: 'sRGB IEC61966-2.1',
    simulationProfile: 'ISOcoated_v2_300_eci',
    substrate: 'Coated',
    simulatePaperColor: true,
    simulateBlackInk: true,
    simulateGlossVarnish: true,
    inkLimit: 300,
    dotGainCurve: 14,
    screeningType: 'AM',
    screenFrequency: 175,
    yuleNielsenN: 2.0,
    inverseDotGainEnabled: false,
    idgScatterFactor: 1.0,
  };

  return {
    id: 'job_carton_demo',
    name: 'Folding_Carton_LuxuryPerfume_B2',
    format: 'MultiChannelTiff',
    status: 'Ready',
    createdAt: new Date().toISOString(),
    metadata,
    separations,
    plates,
    settings,
  };
}

/**
 * Job 2: Genuine 1-Bit Halftone Screening Plates (AM Screening 175 LPI)
 * Generates true 1-bit bi-level pixels with screen angles (C: 15°, M: 75°, Y: 0°, K: 45°).
 * When composited, this creates realistic rosette patterns!
 */
function createHalftoneAmJob(): PrintJob {
  const width = 1000;
  const height = 800;
  const dpi = 2400; // True CTP 2400 DPI plate resolution
  const size = width * height;

  const cyan = new Uint8Array(size);
  const magenta = new Uint8Array(size);
  const yellow = new Uint8Array(size);
  const black = new Uint8Array(size);

  // Screen cell size in pixels: at 2400 DPI / 175 LPI ~= 13.7 pixels period
  const period = 14;

  const angles = {
    cyan: (15 * Math.PI) / 180,
    magenta: (75 * Math.PI) / 180,
    yellow: (0 * Math.PI) / 180,
    black: (45 * Math.PI) / 180,
  };

  for (let y = 0; y < height; y++) {
    const normY = y / height;
    for (let x = 0; x < width; x++) {
      const normX = x / width;
      const idx = y * width + x;

      // Desired continuous tone density (0.0 to 1.0)
      const targetC = Math.max(0.05, Math.min(0.95, 0.2 + normX * 0.6));
      const targetM = Math.max(0.05, Math.min(0.95, 0.8 - normY * 0.6));
      const targetY = Math.max(0.05, Math.min(0.95, normX * 0.5 + normY * 0.4));
      const targetK = Math.max(0, Math.min(0.85, (normX > 0.5 && normY > 0.5) ? (normX - 0.5) * 1.5 : 0.05));

      // Calculate halftone dot threshold using rotated grid
      // Cyan (15°)
      const uC = x * Math.cos(angles.cyan) - y * Math.sin(angles.cyan);
      const vC = x * Math.sin(angles.cyan) + y * Math.cos(angles.cyan);
      const dotC = (Math.cos((uC * 2 * Math.PI) / period) + Math.cos((vC * 2 * Math.PI) / period) + 2) / 4;
      cyan[idx] = dotC < targetC ? 255 : 0;

      // Magenta (75°)
      const uM = x * Math.cos(angles.magenta) - y * Math.sin(angles.magenta);
      const vM = x * Math.sin(angles.magenta) + y * Math.cos(angles.magenta);
      const dotM = (Math.cos((uM * 2 * Math.PI) / period) + Math.cos((vM * 2 * Math.PI) / period) + 2) / 4;
      magenta[idx] = dotM < targetM ? 255 : 0;

      // Yellow (0°)
      const uY = x * Math.cos(angles.yellow) - y * Math.sin(angles.yellow);
      const vY = x * Math.sin(angles.yellow) + y * Math.cos(angles.yellow);
      const dotY = (Math.cos((uY * 2 * Math.PI) / period) + Math.cos((vY * 2 * Math.PI) / period) + 2) / 4;
      yellow[idx] = dotY < targetY ? 255 : 0;

      // Black (45°)
      const uK = x * Math.cos(angles.black) - y * Math.sin(angles.black);
      const vK = x * Math.sin(angles.black) + y * Math.cos(angles.black);
      const dotK = (Math.cos((uK * 2 * Math.PI) / period) + Math.cos((vK * 2 * Math.PI) / period) + 2) / 4;
      black[idx] = dotK < targetK ? 255 : 0;
    }
  }

  const separations: Separation[] = [
    {
      id: 'sep_1bit_c',
      name: 'Plate 1 - Cyan (15°)',
      index: 0,
      fileName: '1Bit_Separation_Cyan.tif',
      colorType: 'ProcessCyan',
      isSpotColor: false,
      isTechnical: false,
      screenAngle: 15,
      screenLpi: 175,
      dotShape: 'Euclidean',
      customRgb: PREPRESS_INK_COLORS.ProcessCyan,
    },
    {
      id: 'sep_1bit_m',
      name: 'Plate 2 - Magenta (75°)',
      index: 1,
      fileName: '1Bit_Separation_Magenta.tif',
      colorType: 'ProcessMagenta',
      isSpotColor: false,
      isTechnical: false,
      screenAngle: 75,
      screenLpi: 175,
      dotShape: 'Euclidean',
      customRgb: PREPRESS_INK_COLORS.ProcessMagenta,
    },
    {
      id: 'sep_1bit_y',
      name: 'Plate 3 - Yellow (0°)',
      index: 2,
      fileName: '1Bit_Separation_Yellow.tif',
      colorType: 'ProcessYellow',
      isSpotColor: false,
      isTechnical: false,
      screenAngle: 0,
      screenLpi: 175,
      dotShape: 'Euclidean',
      customRgb: PREPRESS_INK_COLORS.ProcessYellow,
    },
    {
      id: 'sep_1bit_k',
      name: 'Plate 4 - Black (45°)',
      index: 3,
      fileName: '1Bit_Separation_Black.tif',
      colorType: 'ProcessBlack',
      isSpotColor: false,
      isTechnical: false,
      screenAngle: 45,
      screenLpi: 175,
      dotShape: 'Euclidean',
      customRgb: PREPRESS_INK_COLORS.ProcessBlack,
    },
  ];

  const rawArrays = [cyan, magenta, yellow, black];

  const plates: PlateLayer[] = separations.map((sep, idx) => {
    const raw = rawArrays[idx];
    let sum = 0;
    for (let i = 0; i < size; i++) sum += raw[i];
    const inkedAreaPercent = Number(((sum * 100) / (255 * size)).toFixed(2));

    return {
      separation: sep,
      width,
      height,
      coverage: raw,
      r: sep.customRgb![0],
      g: sep.customRgb![1],
      b: sep.customRgb![2],
      visible: true,
      solo: false,
      inverted: false,
      shiftX: 0,
      shiftY: 0,
      inkedAreaPercent,
      bitDepth: 1,
      compressionName: 'CCITT Group 4 (CTP)',
      originalWidth: width,
      originalHeight: height,
      downsampleFactor: 1,
    };
  });

  return {
    id: 'job_halftone_1bit',
    name: '1Bit_Halftone_AM175_RosettePlateSet',
    format: 'OneBitTiffSeparations',
    status: 'Ready',
    createdAt: new Date().toISOString(),
    metadata: {
      ripName: 'Screen Truepress CTP / Harlequin',
      ripVersion: '12.0',
      pressName: 'Komori Lithrone G40',
      width,
      height,
      displayWidth: width,
      displayHeight: height,
      downsampleFactor: 1,
      resolution: dpi,
      bitDepth: 1,
      colorSpace: 'CMYK',
      separationNames: separations.map(s => s.name),
      dateTime: '2026-10-16 09:15:00',
      software: 'Esko FlexRip / SoftProof TIFF Engine',
      sourceFiles: separations.map(s => s.fileName),
    },
    separations,
    plates,
    settings: {
      displayProfile: 'sRGB IEC61966-2.1',
      simulationProfile: 'GRACoL2006_Coated1v2',
      substrate: 'Coated',
      simulatePaperColor: true,
      simulateBlackInk: true,
      simulateGlossVarnish: false,
      inkLimit: 320,
      dotGainCurve: 16,
      screeningType: 'AM',
      screenFrequency: 175,
      yuleNielsenN: 2.1,
      inverseDotGainEnabled: false,
      idgScatterFactor: 1.0,
    },
  };
}

/**
 * Job 3: Hamillroad FirstPROOF IDG Stochastic FM Screen Test
 */
function createStochasticFmJob(): PrintJob {
  const width = 800;
  const height = 600;
  const dpi = 2400;
  const size = width * height;

  const cyan = new Uint8Array(size);
  const magenta = new Uint8Array(size);
  const yellow = new Uint8Array(size);
  const black = new Uint8Array(size);

  // Blue-noise pseudo-random dither pattern for stochastic FM
  for (let i = 0; i < size; i++) {
    const x = i % width;
    const y = Math.floor(i / width);
    const grad = x / width;

    // Pseudo-random noise
    const seed = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    const rnd = seed - Math.floor(seed);

    cyan[i] = rnd < grad * 0.7 ? 255 : 0;
    magenta[i] = rnd < (1 - grad) * 0.6 ? 255 : 0;
    yellow[i] = rnd < 0.4 ? 255 : 0;
    black[i] = rnd < (x > width * 0.6 ? (x / width - 0.6) * 1.5 : 0.05) ? 255 : 0;
  }

  const separations: Separation[] = [
    {
      id: 'sep_fm_c',
      name: 'Auraia FM Cyan (20µm)',
      index: 0,
      fileName: 'Stochastic_Cyan_20u.tif',
      colorType: 'ProcessCyan',
      isSpotColor: false,
      isTechnical: false,
      screenAngle: 0,
      screenLpi: 300,
      dotShape: 'Stochastic',
      customRgb: PREPRESS_INK_COLORS.ProcessCyan,
    },
    {
      id: 'sep_fm_m',
      name: 'Auraia FM Magenta (20µm)',
      index: 1,
      fileName: 'Stochastic_Magenta_20u.tif',
      colorType: 'ProcessMagenta',
      isSpotColor: false,
      isTechnical: false,
      screenAngle: 0,
      screenLpi: 300,
      dotShape: 'Stochastic',
      customRgb: PREPRESS_INK_COLORS.ProcessMagenta,
    },
    {
      id: 'sep_fm_y',
      name: 'Auraia FM Yellow (20µm)',
      index: 2,
      fileName: 'Stochastic_Yellow_20u.tif',
      colorType: 'ProcessYellow',
      isSpotColor: false,
      isTechnical: false,
      screenAngle: 0,
      screenLpi: 300,
      dotShape: 'Stochastic',
      customRgb: PREPRESS_INK_COLORS.ProcessYellow,
    },
    {
      id: 'sep_fm_k',
      name: 'Auraia FM Black (20µm)',
      index: 3,
      fileName: 'Stochastic_Black_20u.tif',
      colorType: 'ProcessBlack',
      isSpotColor: false,
      isTechnical: false,
      screenAngle: 0,
      screenLpi: 300,
      dotShape: 'Stochastic',
      customRgb: PREPRESS_INK_COLORS.ProcessBlack,
    },
  ];

  const rawArrays = [cyan, magenta, yellow, black];

  const plates: PlateLayer[] = separations.map((sep, idx) => {
    const raw = rawArrays[idx];
    let sum = 0;
    for (let i = 0; i < size; i++) sum += raw[i];
    const inkedAreaPercent = Number(((sum * 100) / (255 * size)).toFixed(2));

    return {
      separation: sep,
      width,
      height,
      coverage: raw,
      r: sep.customRgb![0],
      g: sep.customRgb![1],
      b: sep.customRgb![2],
      visible: true,
      solo: false,
      inverted: false,
      shiftX: 0,
      shiftY: 0,
      inkedAreaPercent,
      bitDepth: 1,
      compressionName: 'CCITT Group 4',
      originalWidth: width,
      originalHeight: height,
      downsampleFactor: 1,
    };
  });

  return {
    id: 'job_stochastic_fm',
    name: 'Hamillroad_FirstPROOF_FM_Stochastic_PlateSet',
    format: 'OneBitTiffSeparations',
    status: 'Ready',
    createdAt: new Date().toISOString(),
    metadata: {
      ripName: 'Hamillroad Auraia DMS / FirstPROOF Engine',
      ripVersion: '4.8',
      pressName: 'Manroland R700 Evolution',
      width,
      height,
      displayWidth: width,
      displayHeight: height,
      downsampleFactor: 1,
      resolution: dpi,
      bitDepth: 1,
      colorSpace: 'CMYK',
      separationNames: separations.map(s => s.name),
      dateTime: '2026-10-16 11:30:00',
      software: 'Hamillroad FirstPROOF',
      sourceFiles: separations.map(s => s.fileName),
    },
    separations,
    plates,
    settings: {
      displayProfile: 'sRGB IEC61966-2.1',
      simulationProfile: 'PSOcoated_v3',
      substrate: 'Coated',
      simulatePaperColor: true,
      simulateBlackInk: true,
      simulateGlossVarnish: false,
      inkLimit: 300,
      dotGainCurve: 18,
      screeningType: 'FM',
      screenFrequency: 300,
      yuleNielsenN: 2.2,
      inverseDotGainEnabled: true,
      idgScatterFactor: 1.25,
    },
  };
}

/**
 * Job 4: Beverage Label with Spot Reflex Blue, Warm Red & Opaque White
 */
function createBeverageLabelJob(): PrintJob {
  const width = 900;
  const height = 900;
  const size = width * height;

  const cyan = new Uint8Array(size);
  const magenta = new Uint8Array(size);
  const yellow = new Uint8Array(size);
  const black = new Uint8Array(size);
  const reflexBlue = new Uint8Array(size);
  const warmRed = new Uint8Array(size);
  const white = new Uint8Array(size);

  const cx = width / 2;
  const cy = height / 2;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);

      // Round Bottle Label
      if (dist < 380) {
        // Opaque white underprint primer
        white[idx] = 255;

        // Outer circular band: Pantone Reflex Blue
        if (dist > 300 && dist < 370) {
          reflexBlue[idx] = 245;
        }

        // Inner Medallion: Warm Red
        if (dist > 180 && dist <= 290) {
          warmRed[idx] = 235;
          yellow[idx] = 40;
        }

        // Center Crest: CMYK
        if (dist <= 170) {
          const relX = (x - (cx - 150)) / 300;
          const relY = (y - (cy - 150)) / 300;
          cyan[idx] = Math.round(relX * 180);
          magenta[idx] = Math.round(relY * 190);
          yellow[idx] = Math.round((1 - relX) * 200);
          if (dist < 60) black[idx] = 220;
        }
      }
    }
  }

  const separations: Separation[] = [
    {
      id: 'sep_label_c',
      name: 'Process Cyan',
      index: 0,
      fileName: 'Label_Cyan.tif',
      colorType: 'ProcessCyan',
      isSpotColor: false,
      isTechnical: false,
      screenAngle: 15,
      screenLpi: 150,
      dotShape: 'Round',
      customRgb: PREPRESS_INK_COLORS.ProcessCyan,
    },
    {
      id: 'sep_label_m',
      name: 'Process Magenta',
      index: 1,
      fileName: 'Label_Magenta.tif',
      colorType: 'ProcessMagenta',
      isSpotColor: false,
      isTechnical: false,
      screenAngle: 75,
      screenLpi: 150,
      dotShape: 'Round',
      customRgb: PREPRESS_INK_COLORS.ProcessMagenta,
    },
    {
      id: 'sep_label_y',
      name: 'Process Yellow',
      index: 2,
      fileName: 'Label_Yellow.tif',
      colorType: 'ProcessYellow',
      isSpotColor: false,
      isTechnical: false,
      screenAngle: 0,
      screenLpi: 150,
      dotShape: 'Round',
      customRgb: PREPRESS_INK_COLORS.ProcessYellow,
    },
    {
      id: 'sep_label_k',
      name: 'Process Black',
      index: 3,
      fileName: 'Label_Black.tif',
      colorType: 'ProcessBlack',
      isSpotColor: false,
      isTechnical: false,
      screenAngle: 45,
      screenLpi: 150,
      dotShape: 'Round',
      customRgb: PREPRESS_INK_COLORS.ProcessBlack,
    },
    {
      id: 'sep_label_blue',
      name: 'PANTONE Reflex Blue C',
      index: 4,
      fileName: 'Label_PantoneReflexBlue.tif',
      colorType: 'SpotColor',
      isSpotColor: true,
      spotColorName: 'PANTONE Reflex Blue C',
      isTechnical: false,
      screenAngle: 15,
      screenLpi: 150,
      dotShape: 'Round',
      customRgb: [30, 45, 140],
    },
    {
      id: 'sep_label_red',
      name: 'PANTONE Warm Red C',
      index: 5,
      fileName: 'Label_PantoneWarmRed.tif',
      colorType: 'SpotColor',
      isSpotColor: true,
      spotColorName: 'PANTONE Warm Red C',
      isTechnical: false,
      screenAngle: 75,
      screenLpi: 150,
      dotShape: 'Round',
      customRgb: [238, 50, 36],
    },
    {
      id: 'sep_label_white',
      name: 'Opaque White Primer',
      index: 6,
      fileName: 'Label_OpaqueWhite.tif',
      colorType: 'White',
      isSpotColor: false,
      isTechnical: false,
      screenAngle: 45,
      screenLpi: 150,
      dotShape: 'Solid',
      customRgb: [240, 240, 248],
    },
  ];

  const rawArrays = [cyan, magenta, yellow, black, reflexBlue, warmRed, white];

  const plates: PlateLayer[] = separations.map((sep, idx) => {
    const raw = rawArrays[idx];
    let sum = 0;
    for (let i = 0; i < size; i++) sum += raw[i];
    const inkedAreaPercent = Number(((sum * 100) / (255 * size)).toFixed(2));

    return {
      separation: sep,
      width,
      height,
      coverage: raw,
      r: sep.customRgb![0],
      g: sep.customRgb![1],
      b: sep.customRgb![2],
      visible: true,
      solo: false,
      inverted: false,
      shiftX: 0,
      shiftY: 0,
      inkedAreaPercent,
      bitDepth: 8,
      compressionName: 'LZW',
      originalWidth: width,
      originalHeight: height,
      downsampleFactor: 1,
    };
  });

  return {
    id: 'job_beverage_label',
    name: 'Artisan_Spirits_CircularLabel_70mm',
    format: 'MultiChannelTiff',
    status: 'Ready',
    createdAt: new Date().toISOString(),
    metadata: {
      ripName: 'Esko Nexus / FlexRip',
      ripVersion: '22.03',
      pressName: 'Nilpeter MO-4 Offset Flexo Combo',
      width,
      height,
      displayWidth: width,
      displayHeight: height,
      downsampleFactor: 1,
      resolution: 300,
      bitDepth: 8,
      colorSpace: 'CMYK + Spots',
      separationNames: separations.map(s => s.name),
      dateTime: '2026-10-16 16:45:12',
      software: 'Esko Software Suite',
      sourceFiles: separations.map(s => s.fileName),
    },
    separations,
    plates,
    settings: {
      displayProfile: 'sRGB IEC61966-2.1',
      simulationProfile: 'FOGRA51_Coated',
      substrate: 'Coated',
      simulatePaperColor: true,
      simulateBlackInk: true,
      simulateGlossVarnish: true,
      inkLimit: 310,
      dotGainCurve: 15,
      screeningType: 'AM',
      screenFrequency: 150,
      yuleNielsenN: 2.0,
      inverseDotGainEnabled: false,
      idgScatterFactor: 1.0,
    },
  };
}
