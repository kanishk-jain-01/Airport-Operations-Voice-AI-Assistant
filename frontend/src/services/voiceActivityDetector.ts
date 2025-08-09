import { MicVAD } from '@ricky0123/vad-web';

export interface VADConfig {
  silenceThreshold?: number; // in milliseconds, default 500ms
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onVADMisfire?: () => void;
}

export class VoiceActivityDetector {
  private vad: MicVAD | null = null;
  private silenceThreshold: number;
  private silenceTimer: NodeJS.Timeout | null = null;
  private isSpeaking: boolean = false;
  private onSpeechStart?: () => void;
  private onSpeechEnd?: () => void;
  private onVADMisfire?: () => void;
  private stream: MediaStream | null = null;

  constructor(config: VADConfig = {}) {
    this.silenceThreshold = config.silenceThreshold || 500;
    this.onSpeechStart = config.onSpeechStart;
    this.onSpeechEnd = config.onSpeechEnd;
    this.onVADMisfire = config.onVADMisfire;
  }

  async initialize(stream?: MediaStream): Promise<void> {
    try {
      // If a stream is provided, use it. Otherwise get a new one
      if (stream) {
        this.stream = stream;
      } else {
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      }

      this.vad = await MicVAD.new({
        stream: this.stream,
        onSpeechStart: () => {
          this.handleSpeechStart();
        },
        onSpeechEnd: (audio) => {
          this.handleSpeechEnd(audio);
        },
        onVADMisfire: () => {
          if (this.onVADMisfire) {
            this.onVADMisfire();
          }
        },
        positiveSpeechThreshold: 0.8,
        negativeSpeechThreshold: 0.7,
        redemptionFrames: 8,
        frameSamples: 1536,
        preSpeechPadFrames: 4,
        minSpeechFrames: 4,
      });
    } catch (error) {
      console.error('Failed to initialize VAD:', error);
      throw error;
    }
  }

  private handleSpeechStart(): void {
    this.clearSilenceTimer();
    
    if (!this.isSpeaking) {
      this.isSpeaking = true;
      if (this.onSpeechStart) {
        this.onSpeechStart();
      }
    }
  }

  private handleSpeechEnd(_audio: Float32Array): void {
    // Start silence timer
    this.clearSilenceTimer();
    
    this.silenceTimer = setTimeout(() => {
      if (this.isSpeaking) {
        this.isSpeaking = false;
        if (this.onSpeechEnd) {
          this.onSpeechEnd();
        }
      }
    }, this.silenceThreshold);
  }

  private clearSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  start(): void {
    if (this.vad) {
      this.vad.start();
    }
  }

  pause(): void {
    if (this.vad) {
      this.vad.pause();
      this.clearSilenceTimer();
    }
  }

  destroy(): void {
    this.clearSilenceTimer();
    if (this.vad) {
      this.vad.destroy();
      this.vad = null;
    }
    if (this.stream && !this.stream.active) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  get isListening(): boolean {
    return this.vad !== null;
  }

  setSilenceThreshold(threshold: number): void {
    this.silenceThreshold = threshold;
  }
}