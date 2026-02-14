import * as tf from "@tensorflow/tfjs";

let model: tf.LayersModel | null = null;
let modelLoading: Promise<tf.LayersModel> | null = null;
let modelLoadFailed = false;

export async function loadModel(): Promise<tf.LayersModel> {
  if (model) return model;
  if (modelLoadFailed) throw new Error("Model load previously failed");
  if (modelLoading) return modelLoading;

  modelLoading = tf
    .loadLayersModel("/model/model.json")
    .then((m) => {
      model = m;
      console.log("Digit recognition model loaded successfully");
      return m;
    })
    .catch((err) => {
      modelLoadFailed = true;
      modelLoading = null;
      console.error("Failed to load digit recognition model:", err);
      throw err;
    });

  return modelLoading;
}

/**
 * Preprocess a canvas element for MNIST-style digit recognition.
 * 1. Extract image data
 * 2. Find bounding box of drawn content (center of mass based)
 * 3. Crop, center by center of mass
 * 4. Resize to 28x28 with padding (20x20 content area centered in 28x28, like MNIST)
 * 5. Normalize pixel values, invert to white-on-black
 */
export function preprocessCanvas(canvas: HTMLCanvasElement): tf.Tensor4D {
  return tf.tidy(() => {
    const ctx = canvas.getContext("2d")!;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { data, width, height } = imgData;

    // Find bounding box and center of mass of drawn content
    let minX = width,
      minY = height,
      maxX = 0,
      maxY = 0;
    let totalMass = 0,
      massX = 0,
      massY = 0;
    let hasContent = false;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        const ink = Math.max(0, 255 - brightness) / 255; // inverted: 1 = dark stroke
        if (ink > 0.2) {
          hasContent = true;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
        if (ink > 0.05) {
          totalMass += ink;
          massX += x * ink;
          massY += y * ink;
        }
      }
    }

    if (!hasContent) {
      return tf.zeros([1, 28, 28, 1]) as tf.Tensor4D;
    }

    // Center of mass
    const comX = massX / totalMass;
    const comY = massY / totalMass;

    const cropWidth = maxX - minX + 1;
    const cropHeight = maxY - minY + 1;

    // MNIST-style: content is in a 20x20 box centered in 28x28
    // First create a square crop around the content, then resize to 20x20
    const contentSize = Math.max(cropWidth, cropHeight);
    // Add some margin
    const margin = Math.max(contentSize * 0.15, 4);
    const boxSize = contentSize + margin * 2;

    // Create temp canvas with the content centered by center of mass
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = Math.ceil(boxSize);
    tempCanvas.height = Math.ceil(boxSize);
    const tempCtx = tempCanvas.getContext("2d")!;
    tempCtx.fillStyle = "white";
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Draw so that center of mass is at the center of the temp canvas
    const drawOffsetX = tempCanvas.width / 2 - comX;
    const drawOffsetY = tempCanvas.height / 2 - comY;
    tempCtx.drawImage(canvas, drawOffsetX, drawOffsetY);

    // Now resize to 20x20 (content area in MNIST is ~20x20 within 28x28)
    const contentCanvas = document.createElement("canvas");
    contentCanvas.width = 20;
    contentCanvas.height = 20;
    const contentCtx = contentCanvas.getContext("2d")!;
    contentCtx.fillStyle = "white";
    contentCtx.fillRect(0, 0, 20, 20);
    contentCtx.imageSmoothingEnabled = true;
    contentCtx.imageSmoothingQuality = "high";
    contentCtx.drawImage(
      tempCanvas,
      0,
      0,
      tempCanvas.width,
      tempCanvas.height,
      0,
      0,
      20,
      20
    );

    // Place 20x20 content centered in 28x28 (4px padding on each side)
    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = 28;
    finalCanvas.height = 28;
    const finalCtx = finalCanvas.getContext("2d")!;
    finalCtx.fillStyle = "white";
    finalCtx.fillRect(0, 0, 28, 28);
    finalCtx.drawImage(contentCanvas, 4, 4);

    // Get image data and convert to tensor
    const finalData = finalCtx.getImageData(0, 0, 28, 28);
    const grayscale = new Float32Array(28 * 28);

    for (let i = 0; i < 28 * 28; i++) {
      const idx = i * 4;
      // Convert to grayscale and invert (MNIST: white digit on black bg)
      const brightness =
        (finalData.data[idx] +
          finalData.data[idx + 1] +
          finalData.data[idx + 2]) /
        3;
      grayscale[i] = (255 - brightness) / 255;
    }

    // Normalize: scale so max value is ~1.0
    let maxVal = 0;
    for (let i = 0; i < grayscale.length; i++) {
      maxVal = Math.max(maxVal, grayscale[i]);
    }
    if (maxVal > 0.01) {
      for (let i = 0; i < grayscale.length; i++) {
        grayscale[i] = grayscale[i] / maxVal;
      }
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

  return darkPixels < width * height * 0.005;
}
