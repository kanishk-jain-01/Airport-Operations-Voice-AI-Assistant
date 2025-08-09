export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private onDataCallback: ((chunk: Blob) => void) | null = null;

  async initialize(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });

      const options: MediaRecorderOptions = {
        mimeType: 'audio/webm;codecs=opus'
      };

      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'audio/webm';
      }

      this.mediaRecorder = new MediaRecorder(this.stream, options);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
          if (this.onDataCallback) {
            this.onDataCallback(event.data);
          }
        }
      };

      this.mediaRecorder.onstop = () => {
        console.log('Recording stopped');
      };

    } catch (error) {
      console.error('Failed to initialize audio recorder:', error);
      throw error;
    }
  }

  start(timeslice?: number): void {
    if (!this.mediaRecorder) {
      throw new Error('Audio recorder not initialized');
    }

    this.chunks = [];
    this.mediaRecorder.start(timeslice);
    console.log('Recording started');
  }

  stop(): Promise<Blob> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        throw new Error('Audio recorder not initialized');
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.chunks, { type: 'audio/webm' });
        this.chunks = [];
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  pause(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
    }
  }

  resume(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
    }
  }

  onData(callback: (chunk: Blob) => void): void {
    this.onDataCallback = callback;
  }

  cleanup(): void {
    if (this.mediaRecorder) {
      if (this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
      this.mediaRecorder = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    this.chunks = [];
  }

  get isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording' || false;
  }

  get isPaused(): boolean {
    return this.mediaRecorder?.state === 'paused' || false;
  }
}