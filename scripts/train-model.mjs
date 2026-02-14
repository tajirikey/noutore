/**
 * MNIST Model Training Script
 *
 * Trains a simple CNN for digit recognition (0-9) and saves the model
 * to public/model/ for use in the browser with TensorFlow.js.
 *
 * Usage: node scripts/train-model.mjs
 *
 * Requirements: @tensorflow/tfjs (uses pure JS, no native deps needed)
 */

import * as tf from "@tensorflow/tfjs";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODEL_DIR = join(__dirname, "..", "public", "model");

// ============================================================
// Inline MNIST-like data generator
// Since we can't easily download MNIST in this environment,
// we generate synthetic training data that mimics handwritten digits.
// Each digit is rendered on a 28x28 grid with random variations.
// ============================================================

function createDigitPattern(digit) {
  // Return a 28x28 array representing a digit pattern
  const grid = Array.from({ length: 28 }, () => new Float32Array(28));

  // Helper to draw a line on the grid
  function drawLine(x1, y1, x2, y2, thickness = 2) {
    const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1) * 2;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = Math.round(x1 + (x2 - x1) * t);
      const y = Math.round(y1 + (y2 - y1) * t);
      for (let dy = -thickness; dy <= thickness; dy++) {
        for (let dx = -thickness; dx <= thickness; dx++) {
          const px = x + dx;
          const py = y + dy;
          if (px >= 0 && px < 28 && py >= 0 && py < 28) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= thickness) {
              grid[py][px] = Math.max(
                grid[py][px],
                1.0 - dist / (thickness + 1)
              );
            }
          }
        }
      }
    }
  }

  // Helper to draw an arc
  function drawArc(cx, cy, rx, ry, startAngle, endAngle, thickness = 2) {
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const angle = startAngle + (endAngle - startAngle) * t;
      const x = cx + rx * Math.cos(angle);
      const y = cy + ry * Math.sin(angle);
      for (let dy = -thickness; dy <= thickness; dy++) {
        for (let dx = -thickness; dx <= thickness; dx++) {
          const px = Math.round(x + dx);
          const py = Math.round(y + dy);
          if (px >= 0 && px < 28 && py >= 0 && py < 28) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= thickness) {
              grid[py][px] = Math.max(
                grid[py][px],
                1.0 - dist / (thickness + 1)
              );
            }
          }
        }
      }
    }
  }

  const PI = Math.PI;

  switch (digit) {
    case 0:
      drawArc(14, 14, 7, 10, 0, 2 * PI);
      break;
    case 1:
      drawLine(14, 4, 14, 24);
      drawLine(10, 8, 14, 4);
      drawLine(10, 24, 18, 24);
      break;
    case 2:
      drawArc(14, 10, 6, 5, PI, 0);
      drawLine(20, 10, 8, 24);
      drawLine(8, 24, 20, 24);
      break;
    case 3:
      drawArc(14, 10, 6, 5, PI * 1.2, PI * -0.2);
      drawArc(14, 18, 6, 5, PI * 1.2, PI * -0.2);
      break;
    case 4:
      drawLine(18, 4, 6, 17);
      drawLine(6, 17, 22, 17);
      drawLine(18, 4, 18, 24);
      break;
    case 5:
      drawLine(20, 4, 8, 4);
      drawLine(8, 4, 8, 13);
      drawArc(14, 17, 6, 6, -PI * 0.5, PI * 0.8);
      drawLine(8, 13, 14, 11);
      break;
    case 6:
      drawArc(14, 17, 7, 7, 0, 2 * PI);
      drawArc(18, 10, 8, 8, PI * 0.5, PI);
      break;
    case 7:
      drawLine(6, 4, 22, 4);
      drawLine(22, 4, 12, 24);
      break;
    case 8:
      drawArc(14, 10, 5, 5, 0, 2 * PI);
      drawArc(14, 19, 6, 6, 0, 2 * PI);
      break;
    case 9:
      drawArc(14, 10, 7, 7, 0, 2 * PI);
      drawArc(10, 17, 8, 8, 0, -PI * 0.5);
      break;
  }

  return grid;
}

function generateSample(digit) {
  const baseGrid = createDigitPattern(digit);
  const result = new Float32Array(28 * 28);

  // Apply random transformations
  const offsetX = (Math.random() - 0.5) * 4;
  const offsetY = (Math.random() - 0.5) * 4;
  const scale = 0.85 + Math.random() * 0.3;
  const rotation = (Math.random() - 0.5) * 0.3;
  const thickness = 0.8 + Math.random() * 0.6;

  const cx = 14,
    cy = 14;

  for (let y = 0; y < 28; y++) {
    for (let x = 0; x < 28; x++) {
      // Apply inverse transformation to find source pixel
      const dx = (x - cx) / scale;
      const dy = (y - cy) / scale;
      const cos = Math.cos(-rotation);
      const sin = Math.sin(-rotation);
      const srcX = Math.round(cx + dx * cos - dy * sin - offsetX);
      const srcY = Math.round(cy + dx * sin + dy * cos - offsetY);

      if (srcX >= 0 && srcX < 28 && srcY >= 0 && srcY < 28) {
        let val = baseGrid[srcY][srcX] * thickness;
        // Add noise
        val += (Math.random() - 0.5) * 0.1;
        result[y * 28 + x] = Math.max(0, Math.min(1, val));
      }
    }
  }

  // Apply slight blur
  const blurred = new Float32Array(28 * 28);
  for (let y = 1; y < 27; y++) {
    for (let x = 1; x < 27; x++) {
      let sum = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const w = dx === 0 && dy === 0 ? 4 : 1;
          sum += result[(y + dy) * 28 + (x + dx)] * w;
        }
      }
      blurred[y * 28 + x] = sum / 12;
    }
  }

  return blurred;
}

function generateDataset(samplesPerDigit) {
  console.log(
    `Generating ${samplesPerDigit * 10} training samples...`
  );
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
  model.add(tf.layers.dropout({ rate: 0.2 }));
  model.add(tf.layers.dense({ units: 10, activation: "softmax" }));

  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: "categoricalCrossentropy",
    metrics: ["accuracy"],
  });

  model.summary();

  // Generate training data (synthetic MNIST-like)
  const SAMPLES_PER_DIGIT = 150;
  const { xs: trainXs, ys: trainYs } = generateDataset(SAMPLES_PER_DIGIT);

  // Generate validation data
  const { xs: valXs, ys: valYs } = generateDataset(20);

  console.log("\nTraining model...");
  await model.fit(trainXs, trainYs, {
    epochs: 10,
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

  // Clean up tensors
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

  // Manual save: extract model topology and weights, write to files
  // (Pure @tensorflow/tfjs doesn't have file:// handler)
  const modelJSON = model.toJSON();

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

  const weightsManifest = [];
  for (const w of weightDataAndSpecs) {
    const bytes = new Uint8Array(w.data.buffer);
    weightView.set(bytes, offset);
    weightsManifest.push({
      name: w.name,
      shape: w.shape,
      dtype: w.dtype,
      byteOffset: offset,
      byteLength: w.data.byteLength,
    });
    offset += w.data.byteLength;
  }

  // Write model.json
  const modelArtifact = {
    modelTopology: modelJSON,
    weightsManifest: [
      {
        paths: ["weights.bin"],
        weights: weightsManifest.map((w) => ({
          name: w.name,
          shape: w.shape,
          dtype: w.dtype,
        })),
      },
    ],
  };

  writeFileSync(
    join(MODEL_DIR, "model.json"),
    JSON.stringify(modelArtifact, null, 2)
  );
  writeFileSync(
    join(MODEL_DIR, "weights.bin"),
    Buffer.from(weightBuffer)
  );

  console.log(`\nModel saved to ${MODEL_DIR}`);
  console.log(`  model.json: ${JSON.stringify(modelArtifact).length} bytes`);
  console.log(`  weights.bin: ${totalBytes} bytes`);
}

async function main() {
  console.log("=== MNIST Digit Recognition Model Training ===\n");
  const model = await trainModel();
  await saveModel(model);
  console.log("\nDone! Model is ready for use in the app.");
}

main().catch(console.error);
