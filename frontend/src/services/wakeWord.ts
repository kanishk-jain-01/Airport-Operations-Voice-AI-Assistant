import { Porcupine, BuiltInKeyword } from '@picovoice/porcupine-web';
import type { PorcupineDetection } from '@picovoice/porcupine-web';
import { WebVoiceProcessor } from '@picovoice/web-voice-processor';

export class WakeWordDetector {
  private porcupineInstance: Porcupine | null = null;
  private isListening = false;
  private onWakeWordCallback: (() => void) | null = null;

  async initialize(accessKey: string): Promise<void> {
    if (this.porcupineInstance) {
      await this.cleanup();
    }

    try {
      // Define the model configuration
      const porcupineModel = {
        publicPath: '/porcupine_params.pv', // Model file in public directory
        forceWrite: true,
        version: 1,
      };

      // Create detection callback
      const keywordDetectionCallback = (detection: PorcupineDetection) => {
        if (detection && this.onWakeWordCallback) {
          this.onWakeWordCallback();
        }
      };

      // Initialize Porcupine instance
      this.porcupineInstance = await Porcupine.create(
        accessKey,
        [
          { builtin: BuiltInKeyword.Jarvis },
          { builtin: BuiltInKeyword.Alexa },
          { builtin: BuiltInKeyword.OkayGoogle },
          { builtin: BuiltInKeyword.HeyGoogle },
        ],
        keywordDetectionCallback,
        porcupineModel
      );
    } catch (error) {
      console.error('Failed to initialize Porcupine:', error);
      throw error;
    }
  }

  async start(): Promise<void> {
    if (!this.porcupineInstance) {
      throw new Error('Wake word detector not initialized');
    }

    if (this.isListening) {
      return;
    }

    try {
      await WebVoiceProcessor.subscribe(this.porcupineInstance);
      this.isListening = true;
    } catch (error) {
      console.error('Failed to start wake word detection:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.porcupineInstance || !this.isListening) {
      return;
    }

    try {
      await WebVoiceProcessor.unsubscribe(this.porcupineInstance);
      this.isListening = false;
    } catch (error) {
      console.error('Failed to stop wake word detection:', error);
      throw error;
    }
  }

  onWakeWord(callback: () => void): void {
    this.onWakeWordCallback = callback;
  }

  async cleanup(): Promise<void> {
    if (this.isListening) {
      await this.stop();
    }

    if (this.porcupineInstance) {
      await this.porcupineInstance.release();
      this.porcupineInstance = null;
    }
  }

  get isActive(): boolean {
    return this.isListening;
  }
}
