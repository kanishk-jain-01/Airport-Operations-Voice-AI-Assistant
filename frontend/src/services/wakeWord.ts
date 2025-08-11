export class WakeWordDetector {
  private recognition: SpeechRecognition | null = null;
  private isListening = false;
  private onWakeWordCallback: (() => void) | null = null;
  private wakeWords = ['jarvis', 'alexa', 'okay google', 'hey google'];

  async initialize(_accessKey?: string): Promise<void> {
    // Access key is not needed for Web Speech API, but we keep the parameter for compatibility
    if (this.recognition) {
      await this.cleanup();
    }

    try {
      // Check if Web Speech API is supported
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        throw new Error('Web Speech API is not supported in this browser');
      }

      // Initialize Speech Recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      if (!this.recognition) {
        throw new Error('Failed to create SpeechRecognition instance');
      }
      
      // Configure speech recognition
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
      
      // Set up event handlers
      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        const lastResult = event.results[event.results.length - 1];
        if (lastResult.isFinal) {
          const transcript = lastResult[0].transcript.toLowerCase().trim();
          console.log('Wake word detector heard:', transcript);
          
          // Check if any wake word is detected
          const wakeWordDetected = this.wakeWords.some(wakeWord => 
            transcript.includes(wakeWord)
          );
          
          if (wakeWordDetected && this.onWakeWordCallback) {
            console.log('Wake word detected:', transcript);
            this.onWakeWordCallback();
          }
        }
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech' || event.error === 'audio-capture') {
          // Restart recognition on certain errors
          setTimeout(() => {
            if (this.isListening && this.recognition) {
              try {
                this.recognition.start();
              } catch (err) {
                console.warn('Failed to restart speech recognition:', err);
              }
            }
          }, 1000);
        }
      };

      this.recognition.onend = () => {
        // Automatically restart if we're supposed to be listening
        if (this.isListening) {
          setTimeout(() => {
            if (this.isListening && this.recognition) {
              try {
                this.recognition.start();
              } catch (err) {
                console.warn('Failed to restart speech recognition:', err);
              }
            }
          }, 100);
        }
      };

    } catch (error) {
      console.error('Failed to initialize Wake Word Detector:', error);
      throw error;
    }
  }

  async start(): Promise<void> {
    if (!this.recognition) {
      throw new Error('Wake word detector not initialized');
    }

    if (this.isListening) {
      return;
    }

    try {
      this.isListening = true;
      this.recognition.start();
      console.log('Wake word detection started');
    } catch (error) {
      console.error('Failed to start wake word detection:', error);
      this.isListening = false;
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.recognition || !this.isListening) {
      return;
    }

    try {
      this.isListening = false;
      this.recognition.stop();
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

    if (this.recognition) {
      this.recognition.onresult = null;
      this.recognition.onerror = null;
      this.recognition.onend = null;
      this.recognition = null;
    }
  }

  get isActive(): boolean {
    return this.isListening;
  }

  // Add method to customize wake words
  setWakeWords(words: string[]): void {
    this.wakeWords = words.map(word => word.toLowerCase());
  }

  // Add method to get current wake words
  getWakeWords(): string[] {
    return [...this.wakeWords];
  }
}

