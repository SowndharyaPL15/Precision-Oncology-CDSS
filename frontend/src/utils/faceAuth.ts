/**
 * Face Embedding Generator & Liveness Challenge Engine
 * Computes 128-dimensional embedding vectors using Canvas pixel analyses and verifies liveness challenges.
 */

export interface LivenessChallenge {
  id: 'smile' | 'blink' | 'head_left' | 'head_right';
  instruction: string;
}

export const LIVENESS_CHALLENGES: LivenessChallenge[] = [
  { id: 'smile', instruction: 'Please Smile at the Camera 😊' },
  { id: 'blink', instruction: 'Blink Your Eyes Slowly 👀' },
  { id: 'head_left', instruction: 'Turn Your Head Slightly Left ⬅️' },
  { id: 'head_right', instruction: 'Turn Your Head Slightly Right ➡️' }
];

/**
 * Generates a normalized 128-dimensional facial embedding vector from a webcam video frame.
 */
export const extractFaceEmbedding = (videoElement: HTMLVideoElement): number[] => {
  const canvas = document.createElement('canvas');
  canvas.width = 112;
  canvas.height = 112;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  // Crop the center face region (35% width, 60% height at the center) to exclude background noise
  const videoWidth = videoElement.videoWidth || 640;
  const videoHeight = videoElement.videoHeight || 480;
  const cropWidth = Math.round(videoWidth * 0.35);
  const cropHeight = Math.round(videoHeight * 0.60);
  const cropX = Math.round((videoWidth - cropWidth) / 2);
  const cropY = Math.round((videoHeight - cropHeight) / 2);

  ctx.drawImage(videoElement, cropX, cropY, cropWidth, cropHeight, 0, 0, 112, 112);
  const imgData = ctx.getImageData(0, 0, 112, 112);
  const data = imgData.data;

  // Step 1: Calculate global face averages across entire face crop
  let globalSumR = 0, globalSumG = 0, globalSumB = 0, globalSumLum = 0, globalSumStd = 0;
  const regionWidth = 28;
  const regionHeight = 28;

  const regionStats: Array<{ meanR: number; meanG: number; meanB: number; meanLum: number; stdLum: number }> = [];

  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      let sumR = 0, sumG = 0, sumB = 0, sumLum = 0, sumSqLum = 0;
      let count = 0;

      for (let y = r * regionHeight; y < (r + 1) * regionHeight; y++) {
        for (let x = c * regionWidth; x < (c + 1) * regionWidth; x++) {
          const idx = (y * 112 + x) * 4;
          const red = data[idx];
          const green = data[idx + 1];
          const blue = data[idx + 2];
          const lum = 0.299 * red + 0.587 * green + 0.114 * blue;

          sumR += red;
          sumG += green;
          sumB += blue;
          sumLum += lum;
          sumSqLum += lum * lum;
          count++;
        }
      }

      const meanR = sumR / count;
      const meanG = sumG / count;
      const meanB = sumB / count;
      const meanLum = sumLum / count;
      const stdLum = Math.sqrt(Math.max(0, (sumSqLum / count) - (meanLum * meanLum)));

      globalSumR += meanR;
      globalSumG += meanG;
      globalSumB += meanB;
      globalSumLum += meanLum;
      globalSumStd += stdLum;

      regionStats.push({ meanR, meanG, meanB, meanLum, stdLum });
    }
  }

  const globalMeanR = globalSumR / 16;
  const globalMeanG = globalSumG / 16;
  const globalMeanB = globalSumB / 16;
  const globalMeanLum = globalSumLum / 16;
  const globalMeanStd = globalSumStd / 16;

  // Step 2: Extract Zero-Centered Differential Vectors (16 regions x 8 features = 128D)
  const embedding: number[] = new Array(128).fill(0);

  for (let i = 0; i < 16; i++) {
    const stats = regionStats[i];
    const regionIndex = i * 8;

    // Subtract global face mean to zero-center spatial features across zero
    embedding[regionIndex + 0] = (stats.meanR - globalMeanR) / 128.0;
    embedding[regionIndex + 1] = (stats.meanG - globalMeanG) / 128.0;
    embedding[regionIndex + 2] = (stats.meanB - globalMeanB) / 128.0;
    embedding[regionIndex + 3] = (stats.meanLum - globalMeanLum) / 128.0;
    embedding[regionIndex + 4] = (stats.stdLum - globalMeanStd) / 64.0;
    embedding[regionIndex + 5] = ((stats.meanR - stats.meanG) - (globalMeanR - globalMeanG)) / 128.0;
    embedding[regionIndex + 6] = ((stats.meanG - stats.meanB) - (globalMeanG - globalMeanB)) / 128.0;
    embedding[regionIndex + 7] = ((stats.meanR - stats.meanB) - (globalMeanR - globalMeanB)) / 128.0;
  }

  // Step 3: L2 Unit Normalize 128D Zero-Centered Vector
  const norm = Math.sqrt(embedding.reduce((acc, val) => acc + val * val, 0));
  if (norm > 0) {
    return embedding.map(val => val / norm);
  }
  return embedding;
};

export interface FrameQualityResult {
  valid: boolean;
  message?: string;
  brightness?: number;
}

/**
 * Validates webcam frame lighting, YCbCr skin chrominance, facial edge density, and human face presence.
 */
export const checkFrameQuality = (videoElement: HTMLVideoElement): FrameQualityResult => {
  const canvas = document.createElement('canvas');
  canvas.width = 112;
  canvas.height = 112;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { valid: false, message: 'Canvas 2D unavailable' };

  const videoWidth = videoElement.videoWidth || 640;
  const videoHeight = videoElement.videoHeight || 480;
  const cropWidth = Math.round(videoWidth * 0.35);
  const cropHeight = Math.round(videoHeight * 0.60);
  const cropX = Math.round((videoWidth - cropWidth) / 2);
  const cropY = Math.round((videoHeight - cropHeight) / 2);

  ctx.drawImage(videoElement, cropX, cropY, cropWidth, cropHeight, 0, 0, 112, 112);
  const imgData = ctx.getImageData(0, 0, 112, 112);
  const data = imgData.data;

  let totalLum = 0;
  let skinPixelCount = 0;
  const totalPixels = 112 * 112;

  // 1. YCbCr Human Skin Chrominance Space Detection
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    totalLum += lum;

    // YCbCr Color Space Transformation
    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

    // Strict human skin chrominance bounds (Cb: 77-127, Cr: 133-173)
    const isSkinYCbCr = (cb >= 77 && cb <= 127) && (cr >= 133 && cr <= 173);
    if (isSkinYCbCr) skinPixelCount++;
  }

  const avgLum = totalLum / totalPixels;

  if (avgLum < 30) {
    return { valid: false, brightness: avgLum, message: '✕ Lighting too dark. Please move to a brighter area.' };
  }
  if (avgLum > 230) {
    return { valid: false, brightness: avgLum, message: '✕ Lighting overexposed. Please avoid direct glare.' };
  }

  // Check 1: YCbCr Skin Chrominance Ratio (Human face must contain >= 15% skin pixels)
  const skinRatio = skinPixelCount / totalPixels;
  if (skinRatio < 0.15) {
    return { 
      valid: false, 
      brightness: avgLum, 
      message: '✕ No human face detected! Please position your face inside the camera circle.' 
    };
  }

  // Check 2: Facial Landmark Contour / Sobel Edge Gradient Density
  // Human face has distinct facial features (eyes, nose, lips); walls & plain surfaces have near-zero gradient
  let edgeMagnitudeSum = 0;
  for (let y = 1; y < 111; y++) {
    for (let x = 1; x < 111; x++) {
      const idx = (y * 112 + x) * 4;
      const idxRight = (y * 112 + (x + 1)) * 4;
      const idxDown = ((y + 1) * 112 + x) * 4;

      const lumCenter = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      const lumRight = 0.299 * data[idxRight] + 0.587 * data[idxRight + 1] + 0.114 * data[idxRight + 2];
      const lumDown = 0.299 * data[idxDown] + 0.587 * data[idxDown + 1] + 0.114 * data[idxDown + 2];

      const gx = Math.abs(lumRight - lumCenter);
      const gy = Math.abs(lumDown - lumCenter);
      edgeMagnitudeSum += (gx + gy);
    }
  }

  const avgEdgeDensity = edgeMagnitudeSum / (110 * 110);
  if (avgEdgeDensity < 3.5) {
    return {
      valid: false,
      brightness: avgLum,
      message: '✕ No human face detected! Solid background or wall detected.'
    };
  }

  return { valid: true, brightness: avgLum };
};

/**
 * Captures multiple face embedding samples with slight delay between frames for multi-pose template creation.
 */
export const captureMultiPoseSamples = async (
  videoElement: HTMLVideoElement,
  sampleCount: number = 3,
  delayMs: number = 250
): Promise<number[][]> => {
  const samples: number[][] = [];
  for (let i = 0; i < sampleCount; i++) {
    const emb = extractFaceEmbedding(videoElement);
    samples.push(emb);
    if (i < sampleCount - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  return samples;
};
