/**
 * Prepress and Soft Proofing Data Types
 * Supporting 1-bit CTP plates, multi-channel separations, and RIP metadata.
 */

export type SeparationColorType =
  | 'ProcessCyan'
  | 'ProcessMagenta'
  | 'ProcessYellow'
  | 'ProcessBlack'
  | 'SpotColor'
  | 'Orange'
  | 'Green'
  | 'Violet'
  | 'Red'
  | 'Blue'
  | 'White'
  | 'Varnish'
  | 'Primer';

export interface Separation {
  id: string;
  name: string;
  index: number;
  fileName: string;
  colorType: SeparationColorType;
  isSpotColor: boolean;
  spotColorName?: string;
  isTechnical: boolean; // e.g. dieline, fold, registration marks
  screenAngle: number;  // typical: C=15°, M=75°, Y=0°, K=45°
  screenLpi: number;    // typical: 150 - 200 LPI
  dotShape: string;     // 'Euclidean' | 'Round' | 'Elliptical' | 'Stochastic'
  customRgb?: [number, number, number]; // Display ink color in sRGB
}

export interface PlateLayer {
  separation: Separation;
  width: number;
  height: number;
  /** 
   * 8-bit coverage array: width * height bytes (0 = 0% ink, 255 = 100% solid ink).
   * For 1-bit plates, 1-bit pixels are unpacked to 0 and 255.
   */
  coverage: Uint8Array;
  // Ink display color in sRGB
  r: number;
  g: number;
  b: number;
  // Per-plate interactive viewer state
  visible: boolean;
  solo: boolean;
  inverted: boolean;
  // Registration shift in pixels for misregistration / trapping inspection
  shiftX: number;
  shiftY: number;
  // Computed statistics
  inkedAreaPercent: number;
  bitDepth: 1 | 8;
  compressionName: string;
  originalWidth: number;
  originalHeight: number;
  downsampleFactor: number;
}

export type RipFormat =
  | 'OneBitTiffSeparations'
  | 'MultiChannelTiff'
  | 'HarlequinPageBuffer'
  | 'EskoLen'
  | 'SyntheticDemo';

export type JobStatus = 'Pending' | 'Loading' | 'Ready' | 'Proofing' | 'Approved' | 'Rejected' | 'Error';

export interface JobMetadata {
  ripName: string;
  ripVersion: string;
  pressName: string;
  width: number;
  height: number;
  displayWidth: number;
  displayHeight: number;
  downsampleFactor: number;
  resolution: number; // DPI (e.g. 2400 for CTP plates, 254/300 for proofs)
  bitDepth: number;   // 1 for CTP plates, 8 for contone
  colorSpace: string; // 'CMYK' | 'CMYK + Spots' | 'MultiChannel'
  separationNames: string[];
  dateTime?: string;
  software?: string;
  sourceFiles: string[];
}

export type ScreeningType = 'AM' | 'FM' | 'Hybrid' | 'HDS' | 'Sublima';

export interface ProofSettings {
  displayProfile: string;
  simulationProfile: string;
  substrate: 'Coated' | 'Uncoated' | 'Newsprint' | 'Kraft';
  simulatePaperColor: boolean;
  simulateBlackInk: boolean;
  simulateGlossVarnish: boolean;
  inkLimit: number; // TAC limit in % (default 300)
  dotGainCurve: number; // % optical + mechanical dot gain (typical 14%)
  screeningType: ScreeningType;
  screenFrequency: number; // LPI
  yuleNielsenN: number; // typical 1.7 - 2.2
  inverseDotGainEnabled: boolean; // Hamillroad FirstPROOF IDG mode
  idgScatterFactor: number;
}

export interface PrintJob {
  id: string;
  name: string;
  format: RipFormat;
  status: JobStatus;
  createdAt: string;
  metadata: JobMetadata;
  separations: Separation[];
  plates: PlateLayer[];
  settings: ProofSettings;
}

export type ViewerTool = 'select' | 'pan' | 'densitometer' | 'measure' | 'loupe' | 'registration';

export type PlateViewMode = 'composite' | 'progressive' | 'film' | 'tacHeatmap';

export interface DensitometerReading {
  x: number;
  y: number;
  xMm: number;
  yMm: number;
  aperture: number;
  perPlate: {
    plateName: string;
    colorType: SeparationColorType;
    rgb: [number, number, number];
    dotAreaPercent: number; // 0 - 100%
    opticalDensity: number; // Status T / Status E (e.g. 0.0 - 2.5D)
    visible: boolean;
  }[];
  totalAreaCoverage: number; // TAC / TIC sum of % (e.g. 245%)
  tacWarning: boolean;
  lab: [number, number, number]; // L*, a*, b*
  rgbPreview: [number, number, number];
}

export interface CaliperMeasurement {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  deltaXPixels: number;
  deltaYPixels: number;
  deltaXMm: number;
  deltaYMm: number;
  distancePixels: number;
  distanceMm: number;
  distanceInches: number;
  angleDegrees: number;
}

export interface PreflightItem {
  id: string;
  category: 'resolution' | 'dimensions' | 'tac' | 'separations' | 'dieline' | 'trapping';
  title: string;
  detail: string;
  status: 'pass' | 'warning' | 'fail' | 'info';
  value?: string;
  limit?: string;
}

export interface SignOffRecord {
  approved: boolean;
  signatoryName: string;
  signatoryRole: string;
  companyName: string;
  timestamp: string;
  notes: string;
  isoStandard: string;
  passedPreflight: boolean;
}
