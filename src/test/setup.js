import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { createCanvas, Image, ImageData } from 'canvas';

// Phaser detects canvas capabilities as it is imported. jsdom intentionally
// returns null from HTMLCanvasElement#getContext, so install node-canvas in
// global setup (before any scene module loads) for renderer-level smoke tests.
Object.assign(globalThis, { Image, ImageData });
if (typeof window !== 'undefined') {
  window.focus = () => {};
  HTMLCanvasElement.prototype.getContext = function getContext(type, options) {
    if (!this.__nodeCanvas) {
      this.__nodeCanvas = createCanvas(this.width || 300, this.height || 150);
    }
    const context = this.__nodeCanvas.getContext(type, options);
    if (!context.__unwrapJsdomCanvas) {
      const drawImage = context.drawImage.bind(context);
      context.drawImage = (image, ...args) => drawImage(image?.__nodeCanvas || image, ...args);
      context.__unwrapJsdomCanvas = true;
    }
    return context;
  };
  HTMLCanvasElement.prototype.toDataURL = function toDataURL(...args) {
    if (!this.__nodeCanvas) {
      this.__nodeCanvas = createCanvas(this.width || 300, this.height || 150);
    }
    return this.__nodeCanvas.toDataURL(...args);
  };
}

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock localStorage with a real Map-based implementation
class LocalStorageMock {
  constructor() {
    this.store = new Map();
  }

  clear() {
    this.store.clear();
  }

  getItem(key) {
    return this.store.get(key) || null;
  }

  setItem(key, value) {
    this.store.set(key, String(value));
  }

  removeItem(key) {
    this.store.delete(key);
  }

  get length() {
    return this.store.size;
  }

  key(index) {
    const keys = Array.from(this.store.keys());
    return keys[index] || null;
  }
}

global.localStorage = new LocalStorageMock();
