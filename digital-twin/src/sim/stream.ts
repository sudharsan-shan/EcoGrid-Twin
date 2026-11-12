/**
 * stream.ts - High-Frequency Telemetry Stream & Preprocessing Pipeline
 * Implements:
 * - Block 1: Sensor data ingestion (solar, load, battery, grid, weather)
 * - Block 2: Data validation, dropout detection, rolling median filter, and time alignment
 * - 300-sample live ring buffer for real-time telemetry streaming
 */

export interface TelemetrySample {
  timestamp: number; // epoch ms
  timeStr: string;
  rawSolarKw: number;
  cleanSolarKw: number;
  rawLoadKw: number;
  cleanLoadKw: number;
  rawBatteryKw: number;
  cleanBatteryKw: number;
  batterySoc: number;
  batteryTempC: number;
  rawGridKw: number;
  cleanGridKw: number;
  ghi: number;
  ambientTempC: number;
  isValid: boolean;
}

export class TelemetryPipeline {
  private buffer: TelemetrySample[] = [];
  private maxBufferSize: number = 300;
  private recentSolarWindow: number[] = [];
  private recentLoadWindow: number[] = [];
  private windowSize: number = 5;

  constructor(maxBufferSize: number = 300) {
    this.maxBufferSize = maxBufferSize;
  }

  /**
   * Preprocessing: Rolling median filter
   */
  private median(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Ingest a raw sample, validate, clean, and append to circular buffer.
   */
  public pushSample(
    targetSolarKw: number,
    targetLoadKw: number,
    batteryKw: number,
    batterySoc: number,
    batteryTempC: number,
    gridKw: number,
    ghi: number,
    ambientTempC: number,
    timeStr: string
  ): TelemetrySample {
    const now = Date.now();

    // Introduce realistic measurement sensor noise (Gaussian-like)
    const noiseSolar = (Math.random() - 0.5) * 1.2;
    const noiseLoad = (Math.random() - 0.5) * 1.5;

    // Simulate occasional sensor dropouts (1% probability)
    const isDropout = Math.random() < 0.01;
    const rawSolarKw = isDropout ? 0 : Math.max(0, targetSolarKw + noiseSolar);
    const rawLoadKw = isDropout ? 0 : Math.max(5, targetLoadKw + noiseLoad);

    // Update window
    this.recentSolarWindow.push(rawSolarKw);
    if (this.recentSolarWindow.length > this.windowSize) {
      this.recentSolarWindow.shift();
    }
    this.recentLoadWindow.push(rawLoadKw);
    if (this.recentLoadWindow.length > this.windowSize) {
      this.recentLoadWindow.shift();
    }

    // Preprocessing: Cleaned values via median filter & outlier rejection
    let cleanSolarKw = this.median(this.recentSolarWindow);
    let cleanLoadKw = this.median(this.recentLoadWindow);

    // If dropout occurred, interpolate using previous clean value
    const lastSample = this.buffer[this.buffer.length - 1];
    if (isDropout && lastSample) {
      cleanSolarKw = lastSample.cleanSolarKw;
      cleanLoadKw = lastSample.cleanLoadKw;
    }

    const cleanBatteryKw = batteryKw;
    const cleanGridKw = cleanLoadKw - cleanSolarKw - cleanBatteryKw;

    const sample: TelemetrySample = {
      timestamp: now,
      timeStr,
      rawSolarKw: Number(rawSolarKw.toFixed(2)),
      cleanSolarKw: Number(cleanSolarKw.toFixed(2)),
      rawLoadKw: Number(rawLoadKw.toFixed(2)),
      cleanLoadKw: Number(cleanLoadKw.toFixed(2)),
      rawBatteryKw: Number(batteryKw.toFixed(2)),
      cleanBatteryKw: Number(cleanBatteryKw.toFixed(2)),
      batterySoc: Number(batterySoc.toFixed(1)),
      batteryTempC: Number(batteryTempC.toFixed(1)),
      rawGridKw: Number(gridKw.toFixed(2)),
      cleanGridKw: Number(cleanGridKw.toFixed(2)),
      ghi: Number(ghi.toFixed(1)),
      ambientTempC: Number(ambientTempC.toFixed(1)),
      isValid: !isDropout,
    };

    this.buffer.push(sample);
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift();
    }

    return sample;
  }

  public getBuffer(): TelemetrySample[] {
    return [...this.buffer];
  }

  public clear(): void {
    this.buffer = [];
    this.recentSolarWindow = [];
    this.recentLoadWindow = [];
  }
}
