import * as tf from "@tensorflow/tfjs";

let model: tf.LayersModel | null = null;
let modelLoading: Promise<tf.LayersModel> | null = null;

export async function loadModel(): Promise<tf.LayersModel> {
  if (model) return model;
  if (modelLoading) return modelLoading;

  modelLoading = tf.loadLayersModel("/model/model.json").then((m) => {
    model = m;
    return m;
  });

  return modelLoading;
}

/**
 * Preprocess a canvas element for MNIST-style digit recognition.
 * 1. Extract image data
 * 2. Find bounding box of drawn content
 * 3. Crop and center
 * 4. Resize to 28x28
 * 5. Normalize pixel values
 */
export function preprocessCanvas(canvas: HTMLCanvasElement): tf.Tensor4D {
  return tf.tidy(() => {
    const ctx = canvas.getContext("2d")!;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { data, width, height } = imgData;

    // Find bounding box of drawn content (non-white pixels)
    let minX = width,
      minY = height,
      maxX = 0,
      maxY = 0;
    let hasContent = false;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        // Check if pixel is dark (drawn)
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        if (brightness < 200) {
          hasContent = true;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    if (!hasContent) {
      // Return empty tensor (all zeros) if nothing drawn
      return tf.zeros([1, 28, 28, 1]) as tf.Tensor4D;
    }

    // Add padding around bounding box
    const padding = 20;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(width - 1, maxX + padding);
    maxY = Math.min(height - 1, maxY + padding);

    const cropWidth = maxX - minX + 1;
    const cropHeight = maxY - minY + 1;

    // Make it square
    const size = Math.max(cropWidth, cropHeight);
    const offsetX = Math.floor((size - cropWidth) / 2);
    const offsetY = Math.floor((size - cropHeight) / 2);

    // Create a new canvas for the cropped and centered image
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = size;
    tempCanvas.height = size;
    const tempCtx = tempCanvas.getContext("2d")!;

    // Fill with white background
    tempCtx.fillStyle = "white";
    tempCtx.fillRect(0, 0, size, size);

    // Draw the cropped region centered
    tempCtx.drawImage(
      canvas,
      minX,
      minY,
      cropWidth,
      cropHeight,
      offsetX,
      offsetY,
      cropWidth,
      cropHeight
    );

    // Resize to 28x28
    const resizeCanvas = document.createElement("canvas");
    resizeCanvas.width = 28;
    resizeCanvas.height = 28;
    const resizeCtx = resizeCanvas.getContext("2d")!;
    resizeCtx.fillStyle = "white";
    resizeCtx.fillRect(0, 0, 28, 28);
    resizeCtx.drawImage(tempCanvas, 0, 0, size, size, 0, 0, 28, 28);

    // Get image data and convert to tensor
    const resizedData = resizeCtx.getImageData(0, 0, 28, 28);
    const grayscale = new Float32Array(28 * 28);

    for (let i = 0; i < 28 * 28; i++) {
      const idx = i * 4;
      // Convert to grayscale and invert (MNIST: white digit on black bg)
      const brightness =
        (resizedData.data[idx] +
          resizedData.data[idx + 1] +
          resizedData.data[idx + 2]) /
        3;
      grayscale[i] = (255 - brightness) / 255;
    }

    return tf.tensor4d(grayscale, [1, 28, 28, 1]);
  });
}

export async function recognizeDigit(
  canvas: HTMLCanvasElement
): Promise<{ digit: number; confidence: number }> {
  const m = await loadModel();
  const input = preprocessCanvas(canvas);
  const prediction = m.predict(input) as tf.Tensor;
  const probabilities = await prediction.data();
  input.dispose();
  prediction.dispose();

  let maxProb = 0;
  let maxIdx = 0;
  for (let i = 0; i < probabilities.length; i++) {
    if (probabilities[i] > maxProb) {
      maxProb = probabilities[i];
      maxIdx = i;
    }
  }

  return { digit: maxIdx, confidence: maxProb };
}

export function isCanvasEmpty(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext("2d")!;
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width, height } = imgData;

  let darkPixels = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      if (brightness < 200) darkPixels++;
    }
  }

  // Consider empty if less than 0.5% of pixels are dark
  return darkPixels < (width * height) * 0.005;
}
