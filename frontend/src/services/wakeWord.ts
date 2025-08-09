import { PorcupineWorker } from '@picovoice/porcupine-web';
import { WebVoiceProcessor } from '@picovoice/web-voice-processor';

export class WakeWordDetector {
  private porcupineWorker: PorcupineWorker | null = null;
  private isListening = false;
  private onWakeWordCallback: (() => void) | null = null;

  async initialize(accessKey: string): Promise<void> {
    try {
      this.porcupineWorker = await PorcupineWorker.create(
        accessKey,
        ['jarvis', 'alexa', 'ok google', 'hey google'],
        (detections: number[]) => {
          if (detections.length > 0 && this.onWakeWordCallback) {
            console.log('Wake word detected:', detections);
            this.onWakeWordCallback();
          }
        }
      );
    } catch (error) {
      console.error('Failed to initialize Porcupine:', error);
      throw error;
    }
  }

  async start(): Promise<void> {
    if (!this.porcupineWorker) {
      throw new Error('Wake word detector not initialized');
    }

    if (this.isListening) {
      return;
    }

    try {
      await WebVoiceProcessor.subscribe(this.porcupineWorker);
      this.isListening = true;
      console.log('Wake word detection started');
    } catch (error) {
      console.error('Failed to start wake word detection:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.porcupineWorker || !this.isListening) {
      return;
    }

    try {
      await WebVoiceProcessor.unsubscribe(this.porcupineWorker);
      this.isListening = false;
      console.log('Wake word detection stopped');
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

    if (this.porcupineWorker) {
      this.porcupineWorker.terminate();
      this.porcupineWorker = null;
    }
  }

  get isActive(): boolean {
    return this.isListening;
  }
}