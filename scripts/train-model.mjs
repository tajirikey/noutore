/**
 * MNIST Model Training Script
 *
 * Trains a simple CNN for digit recognition (0-9) and saves the model
 * to public/model/ for use in the browser with TensorFlow.js.
 *
 * Usage: node scripts/train-model.mjs
 */

import * as tf from "@tensorflow/tfjs";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODEL_DIR = join(__dirname, "..", "public", "model");

// ============================================================
// Multiple digit pattern variants per digit for more variation
// ============================================================

function createDigitPatterns(digit) {
  const patterns = [];

  function makeGrid() {
    return Array.from({ length: 28 }, () => new Float32Array(28));
  }

  function drawLine(grid, x1, y1, x2, y2, thickness = 2.0) {
    const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1) * 3;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = x1 + (x2 - x1) * t;
      const y = y1 + (y2 - y1) * t;
      for (let dy = -Math.ceil(thickness); dy <= Math.ceil(thickness); dy++) {
        for (let dx = -Math.ceil(thickness); dx <= Math.ceil(thickness); dx++) {
          const px = Math.round(x + dx);
          const py = Math.round(y + dy);
          if (px >= 0 && px < 28 && py >= 0 && py < 28) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= thickness) {
              grid[py][px] = Math.max(grid[py][px], 1.0 - dist / (thickness + 0.5));
            }
          }
        }
      }
    }
  }

  function drawArc(grid, cx, cy, rx, ry, startAngle, endAngle, thickness = 2.0) {
    const steps = 80;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const angle = startAngle + (endAngle - startAngle) * t;
      const x = cx + rx * Math.cos(angle);
      const y = cy + ry * Math.sin(angle);
      for (let dy = -Math.ceil(thickness); dy <= Math.ceil(thickness); dy++) {
        for (let dx = -Math.ceil(thickness); dx <= Math.ceil(thickness); dx++) {
          const px = Math.round(x + dx);
          const py = Math.round(y + dy);
          if (px >= 0 && px < 28 && py >= 0 && py < 28) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= thickness) {
              grid[py][px] = Math.max(grid[py][px], 1.0 - dist / (thickness + 0.5));
            }
          }
        }
      }
    }
  }

  const PI = Math.PI;

  switch (digit) {
    case 0: {
      // Variant 1: tall oval
      let g = makeGrid();
      drawArc(g, 14, 14, 6, 10, 0, 2 * PI);
      patterns.push(g);
      // Variant 2: round circle
      g = makeGrid();
      drawArc(g, 14, 14, 8, 8, 0, 2 * PI);
      patterns.push(g);
      // Variant 3: slightly open at top
      g = makeGrid();
      drawArc(g, 14, 14, 7, 10, 0.3, 2 * PI - 0.1);
      patterns.push(g);
      break;
    }
    case 1: {
      // Variant 1: simple vertical line
      let g = makeGrid();
      drawLine(g, 14, 4, 14, 24);
      patterns.push(g);
      // Variant 2: with serif and top hook
      g = makeGrid();
      drawLine(g, 14, 4, 14, 24);
      drawLine(g, 10, 8, 14, 4);
      drawLine(g, 10, 24, 18, 24);
      patterns.push(g);
      // Variant 3: slightly slanted
      g = makeGrid();
      drawLine(g, 13, 4, 15, 24);
      patterns.push(g);
      break;
    }
    case 2: {
      // Variant 1: standard
      let g = makeGrid();
      drawArc(g, 14, 10, 6, 6, PI * 1.1, PI * 0.1);
      drawLine(g, 20, 12, 8, 24);
      drawLine(g, 8, 24, 20, 24);
      patterns.push(g);
      // Variant 2: more curved
      g = makeGrid();
      drawArc(g, 14, 9, 7, 6, PI * 1.2, PI * -0.1);
      drawArc(g, 14, 20, 10, 6, PI * 1.3, PI);
      drawLine(g, 7, 24, 21, 24);
      patterns.push(g);
      break;
    }
    case 3: {
      // Variant 1: two bumps
      let g = makeGrid();
      drawArc(g, 14, 9, 6, 6, PI * 1.3, PI * -0.3);
      drawArc(g, 14, 19, 6, 6, PI * 1.3, PI * -0.3);
      patterns.push(g);
      // Variant 2: flat top, rounded bottom
      g = makeGrid();
      drawLine(g, 8, 4, 18, 4);
      drawLine(g, 18, 4, 12, 13);
      drawArc(g, 14, 19, 7, 7, PI * 1.3, PI * -0.2);
      patterns.push(g);
      break;
    }
    case 4: {
      // Variant 1: closed top
      let g = makeGrid();
      drawLine(g, 18, 4, 6, 17);
      drawLine(g, 6, 17, 22, 17);
      drawLine(g, 18, 4, 18, 24);
      patterns.push(g);
      // Variant 2: open top
      g = makeGrid();
      drawLine(g, 4, 4, 4, 16);
      drawLine(g, 4, 16, 22, 16);
      drawLine(g, 16, 4, 16, 24);
      patterns.push(g);
      break;
    }
    case 5: {
      // Variant 1: standard
      let g = makeGrid();
      drawLine(g, 20, 4, 8, 4);
      drawLine(g, 8, 4, 8, 13);
      drawArc(g, 13, 18, 7, 7, -PI * 0.4, PI * 0.7);
      drawLine(g, 8, 13, 13, 12);
      patterns.push(g);
      // Variant 2: rounder
      g = makeGrid();
      drawLine(g, 20, 4, 8, 4);
      drawLine(g, 8, 4, 7, 14);
      drawArc(g, 14, 18, 8, 7, PI * 0.9, PI * -0.3);
      patterns.push(g);
      break;
    }
    case 6: {
      // Variant 1: standard
      let g = makeGrid();
      drawArc(g, 14, 18, 7, 7, 0, 2 * PI);
      drawArc(g, 19, 10, 9, 9, PI * 0.5, PI * 1.1);
      patterns.push(g);
      // Variant 2: longer stem
      g = makeGrid();
      drawArc(g, 14, 18, 7, 7, 0, 2 * PI);
      drawLine(g, 7, 18, 14, 4);
      patterns.push(g);
      break;
    }
    case 7: {
      // Variant 1: standard
      let g = makeGrid();
      drawLine(g, 6, 4, 22, 4);
      drawLine(g, 22, 4, 12, 24);
      patterns.push(g);
      // Variant 2: with cross bar
      g = makeGrid();
      drawLine(g, 6, 4, 22, 4);
      drawLine(g, 22, 4, 12, 24);
      drawLine(g, 12, 14, 20, 14);
      patterns.push(g);
      // Variant 3: angled differently
      g = makeGrid();
      drawLine(g, 6, 4, 22, 4);
      drawLine(g, 22, 4, 10, 24);
      patterns.push(g);
      break;
    }
    case 8: {
      // Variant 1: standard
      let g = makeGrid();
      drawArc(g, 14, 9, 6, 6, 0, 2 * PI);
      drawArc(g, 14, 19, 7, 6, 0, 2 * PI);
      patterns.push(g);
      // Variant 2: figure 8
      g = makeGrid();
      drawArc(g, 14, 9, 5, 5, 0, 2 * PI);
      drawArc(g, 14, 19, 6, 6, 0, 2 * PI);
      patterns.push(g);
      break;
    }
    case 9: {
      // Variant 1: standard
      let g = makeGrid();
      drawArc(g, 14, 10, 7, 7, 0, 2 * PI);
      drawLine(g, 21, 12, 14, 24);
      patterns.push(g);
      // Variant 2: with straight tail
      g = makeGrid();
      drawArc(g, 14, 10, 6, 6, 0, 2 * PI);
      drawLine(g, 20, 12, 20, 24);
      patterns.push(g);
      break;
    }
  }

  return patterns;
}

function generateSample(digit) {
  const allPatterns = createDigitPatterns(digit);
  const baseGrid = allPatterns[Math.floor(Math.random() * allPatterns.length)];
  const result = new Float32Array(28 * 28);

  // Much larger random transformations for robustness
  const offsetX = (Math.random() - 0.5) * 6;
  const offsetY = (Math.random() - 0.5) * 6;
  const scale = 0.65 + Math.random() * 0.7; // 0.65 to 1.35
  const rotation = (Math.random() - 0.5) * 0.5; // ±14 degrees
  const thicknessMul = 0.5 + Math.random() * 1.2; // 0.5 to 1.7

  // Random shear for more natural variation
  const shearX = (Math.random() - 0.5) * 0.3;
  const shearY = (Math.random() - 0.5) * 0.15;

  const cx = 14, cy = 14;

  for (let y = 0; y < 28; y++) {
    for (let x = 0; x < 28; x++) {
      // Apply inverse transformation to find source pixel
      let dx = (x - cx) / scale;
      let dy = (y - cy) / scale;
      // Shear
      dx -= shearX * dy;
      dy -= shearY * dx;
      // Rotate
      const cos = Math.cos(-rotation);
      const sin = Math.sin(-rotation);
      const srcX = cx + dx * cos - dy * sin - offsetX;
      const srcY = cy + dx * sin + dy * cos - offsetY;

      // Bilinear interpolation
      const sx = Math.floor(srcX);
      const sy = Math.floor(srcY);
      const fx = srcX - sx;
      const fy = srcY - sy;

      let val = 0;
      if (sx >= 0 && sx < 27 && sy >= 0 && sy < 27) {
        val =
          baseGrid[sy][sx] * (1 - fx) * (1 - fy) +
          baseGrid[sy][sx + 1] * fx * (1 - fy) +
          baseGrid[sy + 1][sx] * (1 - fx) * fy +
          baseGrid[sy + 1][sx + 1] * fx * fy;
      } else if (sx >= 0 && sx < 28 && sy >= 0 && sy < 28) {
        val = baseGrid[sy][sx];
      }

      val *= thicknessMul;
      // Add noise
      val += (Math.random() - 0.5) * 0.15;
      result[y * 28 + x] = Math.max(0, Math.min(1, val));
    }
  }

  // Apply Gaussian-like blur (3x3 kernel)
  const blurred = new Float32Array(28 * 28);
  const blurAmount = 0.3 + Math.random() * 0.5; // variable blur
  for (let y = 0; y < 28; y++) {
    for (let x = 0; x < 28; x++) {
      if (y === 0 || y === 27 || x === 0 || x === 27) {
        blurred[y * 28 + x] = result[y * 28 + x];
        continue;
      }
      let center = result[y * 28 + x];
      let neighbors = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          neighbors += result[(y + dy) * 28 + (x + dx)];
        }
      }
      blurred[y * 28 + x] = center * (1 - blurAmount) + (neighbors / 8) * blurAmount;
    }
  }

  // Randomly apply erosion/dilation for thickness variation
  if (Math.random() < 0.3) {
    // Dilate: make strokes thicker
    const dilated = new Float32Array(blurred);
    for (let y = 1; y < 27; y++) {
      for (let x = 1; x < 27; x++) {
        let maxVal = blurred[y * 28 + x];
        maxVal = Math.max(maxVal, blurred[(y - 1) * 28 + x] * 0.7);
        maxVal = Math.max(maxVal, blurred[(y + 1) * 28 + x] * 0.7);
        maxVal = Math.max(maxVal, blurred[y * 28 + x - 1] * 0.7);
        maxVal = Math.max(maxVal, blurred[y * 28 + x + 1] * 0.7);
        dilated[y * 28 + x] = maxVal;
      }
    }
    return dilated;
  }

  return blurred;
}

function generateDataset(samplesPerDigit) {
  console.log(`Generating ${samplesPerDigit * 10} training samples...`);
  const xs = [];
  const ys = [];

  for (let digit = 0; digit < 10; digit++) {
    for (let i = 0; i < samplesPerDigit; i++) {
      xs.push(generateSample(digit));
      ys.push(digit);
    }
  }

  // Shuffle
  const indices = Array.from({ length: xs.length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const shuffledXs = indices.map((i) => xs[i]);
  const shuffledYs = indices.map((i) => ys[i]);

  const xData = new Float32Array(shuffledXs.length * 28 * 28);
  shuffledXs.forEach((sample, i) => {
    xData.set(sample, i * 28 * 28);
  });

  const xTensor = tf.tensor4d(xData, [shuffledXs.length, 28, 28, 1]);
  const yTensor = tf.oneHot(tf.tensor1d(shuffledYs, "int32"), 10);

  return { xs: xTensor, ys: yTensor };
}

async function trainModel() {
  console.log("Creating CNN model...");

  const model = tf.sequential();

  model.add(
    tf.layers.conv2d({
      inputShape: [28, 28, 1],
      filters: 16,
      kernelSize: 5,
      activation: "relu",
    })
  );
  model.add(tf.layers.maxPooling2d({ poolSize: 2 }));
  model.add(
    tf.layers.conv2d({ filters: 32, kernelSize: 3, activation: "relu" })
  );
  model.add(tf.layers.maxPooling2d({ poolSize: 2 }));
  model.add(tf.layers.flatten());
  model.add(tf.layers.dense({ units: 64, activation: "relu" }));
  model.add(tf.layers.dropout({ rate: 0.3 }));
  model.add(tf.layers.dense({ units: 10, activation: "softmax" }));

  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: "categoricalCrossentropy",
    metrics: ["accuracy"],
  });

  model.summary();

  // Generate training data
  const SAMPLES_PER_DIGIT = 200;
  const { xs: trainXs, ys: trainYs } = generateDataset(SAMPLES_PER_DIGIT);

  // Generate validation data
  const { xs: valXs, ys: valYs } = generateDataset(30);

  console.log("\nTraining model...");
  await model.fit(trainXs, trainYs, {
    epochs: 15,
    batchSize: 32,
    validationData: [valXs, valYs],
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        console.log(
          `  Epoch ${epoch + 1}: loss=${logs.loss.toFixed(4)}, acc=${logs.acc.toFixed(4)}, val_acc=${logs.val_acc.toFixed(4)}`
        );
      },
    },
  });

  // Evaluate
  const evalResult = model.evaluate(valXs, valYs);
  const valLoss = (await evalResult[0].data())[0];
  const valAcc = (await evalResult[1].data())[0];
  console.log(
    `\nFinal validation - loss: ${valLoss.toFixed(4)}, accuracy: ${valAcc.toFixed(4)}`
  );

  trainXs.dispose();
  trainYs.dispose();
  valXs.dispose();
  valYs.dispose();

  return model;
}

async function saveModel(model) {
  if (!existsSync(MODEL_DIR)) {
    mkdirSync(MODEL_DIR, { recursive: true });
  }

  // IMPORTANT: model.toJSON() returns a string, but TF.js loadLayersModel
  // expects modelTopology to be a parsed object
  const modelTopology = JSON.parse(model.toJSON());

  // Get weights
  const weightDataAndSpecs = [];
  for (const layer of model.layers) {
    const weights = layer.getWeights();
    for (let i = 0; i < weights.length; i++) {
      const w = weights[i];
      const name = layer.weights[i].name;
      const data = await w.data();
      weightDataAndSpecs.push({
        name,
        shape: w.shape,
        dtype: w.dtype,
        data: new Float32Array(data),
      });
    }
  }

  // Create weight binary file
  let totalBytes = 0;
  for (const w of weightDataAndSpecs) {
    totalBytes += w.data.byteLength;
  }

  const weightBuffer = new ArrayBuffer(totalBytes);
  const weightView = new Uint8Array(weightBuffer);
  let offset = 0;

  for (const w of weightDataAndSpecs) {
    const bytes = new Uint8Array(w.data.buffer);
    weightView.set(bytes, offset);
    offset += w.data.byteLength;
  }

  // Write model.json with PARSED modelTopology (not string!)
  const modelArtifact = {
    modelTopology: modelTopology,
    weightsManifest: [
      {
        paths: ["weights.bin"],
        weights: weightDataAndSpecs.map((w) => ({
          name: w.name,
          shape: w.shape,
          dtype: w.dtype,
        })),
      },
    ],
  };

  writeFileSync(
    join(MODEL_DIR, "model.json"),
    JSON.stringify(modelArtifact)
  );
  writeFileSync(
    join(MODEL_DIR, "weights.bin"),
    Buffer.from(weightBuffer)
  );

  console.log(`\nModel saved to ${MODEL_DIR}`);
  console.log(`  model.json: topology is object type = ${typeof modelArtifact.modelTopology}`);
  console.log(`  weights.bin: ${totalBytes} bytes`);
}

async function main() {
  console.log("=== MNIST Digit Recognition Model Training ===\n");
  const model = await trainModel();
  await saveModel(model);
  console.log("\nDone! Model is ready for use in the app.");
}

main().catch(console.error);
