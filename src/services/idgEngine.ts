import { ProofSettings } from '../types/prepress';

/**
 * Hamillroad FirstPROOF Inverse Dot Gain (IDG) & Optical Dot Gain Engine
 * Simulates photon scatter in the paper substrate (optical dot gain) and ink squeeze (mechanical dot gain).
 */
export interface IdgSimulationResult {
  simulatedCoverage: Uint8Array;
  opticalGainAvg: number;
  mechanicalGainAvg: number;
  totalGainAvg: number;
  granularityScore: number; // 0 - 100
  clusteringScore: number;  // 0 - 100
  uniformityScore: number;  // 0 - 100 (Hamillroad Quality Metric)
}

/**
 * Applies Inverse Dot Gain (IDG) and Press Dot Gain simulation to a plate raster
 */
export function simulatePressDotGain(
  coverage: Uint8Array,
  width: number,
  height: number,
  settings: ProofSettings
): IdgSimulationResult {
  const size = width * height;
  const result = new Uint8Array(size);

  // Yule-Nielsen n-factor and nominal dot gain percent
  const nFactor = settings.yuleNielsenN || 2.0;
  const nominalGain = (settings.dotGainCurve || 14.0) / 100; // e.g. 0.14
  const scatterFactor = settings.idgScatterFactor || 1.0;

  // Substrate optical absorption coefficient
  const substrateScatter = settings.substrate === 'Uncoated' ? 1.4 : settings.substrate === 'Newsprint' ? 1.8 : 1.0;
  const effectiveScatter = scatterFactor * substrateScatter;

  let totalGainSum = 0;
  let opticalGainSum = 0;
  let varianceSum = 0;

  // Fast Separable 2D Gaussian Kernel for Optical Dot Gain (Point Spread Function PSF)
  // Radius ~ 1 to 2 pixels at plate scale
  const kernel = [0.06136, 0.24477, 0.38774, 0.24477, 0.06136];
  const kRadius = 2;

  // Horizontal blur pass into intermediate buffer
  const temp = new Float32Array(size);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let k = -kRadius; k <= kRadius; k++) {
        const nx = Math.min(width - 1, Math.max(0, x + k));
        sum += coverage[rowOffset + nx] * kernel[k + kRadius];
      }
      temp[rowOffset + x] = sum;
    }
  }

  // Vertical blur pass + Murray-Davies / Yule-Nielsen non-linear press transfer
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      let opticalSpread = 0;
      for (let k = -kRadius; k <= kRadius; k++) {
        const ny = Math.min(height - 1, Math.max(0, y + k));
        opticalSpread += temp[ny * width + x] * kernel[k + kRadius];
      }

      const inputVal = coverage[rowOffset + x] / 255.0; // 0.0 to 1.0
      const spreadVal = opticalSpread / 255.0;

      // Optical dot gain delta
      const opticalGainDelta = (spreadVal - inputVal) * 0.35 * effectiveScatter;

      // Mechanical dot gain (parabolic curve peaking at 50% midpoint)
      const mechanicalGainDelta = nominalGain * 4.0 * inputVal * (1.0 - inputVal);

      // Yule-Nielsen modified tone response
      let effectiveDotArea = inputVal + opticalGainDelta + mechanicalGainDelta;

      if (effectiveDotArea > 0 && effectiveDotArea < 1.0) {
        // Apparent optical density / coverage via Yule-Nielsen
        effectiveDotArea = Math.pow(effectiveDotArea, 1.0 / nFactor);
      }

      effectiveDotArea = Math.max(0, Math.min(1.0, effectiveDotArea));
      const finalByte = Math.round(effectiveDotArea * 255);
      result[rowOffset + x] = finalByte;

      const gain = finalByte - coverage[rowOffset + x];
      totalGainSum += gain;
      opticalGainSum += opticalGainDelta * 255;
      varianceSum += (effectiveDotArea - inputVal) ** 2;
    }
  }

  const totalGainAvg = Number(((totalGainSum / size / 255) * 100).toFixed(2));
  const opticalGainAvg = Number(((opticalGainSum / size / 255) * 100).toFixed(2));
  const mechanicalGainAvg = Number((totalGainAvg - opticalGainAvg).toFixed(2));

  // Hamillroad Quality Scores (Uniformity, Granularity, Clustering)
  const rmsError = Math.sqrt(varianceSum / size);
  const granularityScore = Math.max(10, Math.min(98, Math.round(100 - rmsError * 140)));
  const clusteringScore = Math.max(15, Math.min(96, Math.round(92 - Math.abs(nominalGain - 0.14) * 200)));
  const uniformityScore = Math.round((granularityScore * 0.6 + clusteringScore * 0.4));

  return {
    simulatedCoverage: result,
    opticalGainAvg,
    mechanicalGainAvg,
    totalGainAvg,
    granularityScore,
    clusteringScore,
    uniformityScore,
  };
}
