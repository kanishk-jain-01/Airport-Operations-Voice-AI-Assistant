import { useState, useEffect, useCallback, useRef } from 'react';
import { WebSocketClient } from '../services/websocket';
import { AudioRecorder } from '../services/audioRecorder';
import { VoiceActivityDetector } from '../services/voiceActivityDetector';

interface VoiceAssistantState {
  isListening: boolean;
  isProcessing: boolean;
  transcription: string;
  response: string;
  intent: any;
  error: string | null;
  isConnected: boolean;
  vadActive: boolean;
}

interface VADOptions {
  enabled?: boolean;
  silenceThreshold?: number; // milliseconds
  autoStop?: boolean;
}

export const useVoiceAssistantWithVAD = (vadOptions: VADOptions = {}) => {
  const {
    enabled: vadEnabled = true,
    silenceThreshold = 600,
    autoStop = true,
  } = vadOptions;

  const [state, setState] = useState<VoiceAssistantState>({
    isListening: false,
    isProcessing: false,
    transcription: '',
    response: '',
    intent: null,
    error: null,
    isConnected: false,
    vadActive: false,
  });

  const wsClient = useRef<WebSocketClient | null>(null);
  const audioRecorder = useRef<AudioRecorder | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const vad = useRef<VoiceActivityDetector | null>(null);
  const isRecordingTriggeredByWakeWord = useRef<boolean>(false);
  const audioQueue = useRef<Uint8Array[]>([]);
  const isPlayingAudio = useRef<boolean>(false);

  useEffect(() => {
    const initializeServices = async () => {
      console.log('Initializing voice assistant services...');
      
      try {
        // Initialize audio context first
        audioContext.current = new AudioContext();
        
        // Initialize audio recorder
        audioRecorder.current = new AudioRecorder();
        await audioRecorder.current.initialize();
        console.log('Audio recorder initialized');

        // Initialize VAD if enabled (independent of WebSocket)
        if (vadEnabled) {
          try {
            vad.current = new VoiceActivityDetector({
              silenceThreshold,
              onSpeechStart: () => {
                setState(prev => ({ ...prev, vadActive: true }));
                console.log('VAD: Speech detected');
              },
              onSpeechEnd: () => {
                setState(prev => ({ ...prev, vadActive: false }));
                console.log('VAD: Silence detected');
                
                // Auto-stop recording if enabled and recording was triggered by wake word
                if (autoStop && isRecordingTriggeredByWakeWord.current && audioRecorder.current?.isRecording) {
                  console.log('VAD: Auto-stopping recording after silence');
                  stopListening();
                }
              },
              onVADMisfire: () => {
                console.log('VAD: Misfire detected');
              },
            });

            await vad.current.initialize();
            console.log('VAD initialized');
          } catch (vadError) {
            console.warn('VAD initialization failed, continuing without VAD:', vadError);
            vad.current = null;
          }
        }

        // Initialize WebSocket with retry logic
        await initializeWebSocket();
      } catch (error) {
        console.error('Failed to initialize core services:', error);
        setState(prev => ({
          ...prev,
          error: 'Failed to initialize audio services',
        }));
      }
    };

    const initializeWebSocket = async (retryCount = 0) => {
      const maxRetries = 3;
      const retryDelay = 1000 * (retryCount + 1); // Exponential backoff

      try {
        wsClient.current = new WebSocketClient('ws://localhost:8080');
        await wsClient.current.connect();
        console.log('WebSocket initialized');
        
        setState(prev => ({ ...prev, isConnected: true, error: null }));
        setupWebSocketEventHandlers();
      } catch (error) {
        console.error(`WebSocket connection failed (attempt ${retryCount + 1}/${maxRetries + 1}):`, error);
        
        if (retryCount < maxRetries) {
          console.log(`Retrying WebSocket connection in ${retryDelay}ms...`);
          setTimeout(() => {
            initializeWebSocket(retryCount + 1);
          }, retryDelay);
        } else {
          console.error('WebSocket initialization failed after all retries');
          setState(prev => ({
            ...prev,
            error: 'Failed to connect to voice service. Please check if the backend is running.',
            isConnected: false
          }));
        }
      }
    };

    const setupWebSocketEventHandlers = () => {
      if (!wsClient.current) return;

      // WebSocket event handlers
      wsClient.current.on('recording_started', () => {
        setState(prev => ({ ...prev, isListening: true }));
      });

      wsClient.current.on('processing_started', () => {
        setState(prev => ({
          ...prev,
          isProcessing: true,
          isListening: false,
        }));
      });

      wsClient.current.on('transcription', data => {
        setState(prev => ({ ...prev, transcription: data.data }));
      });

      wsClient.current.on('intent', data => {
        setState(prev => ({ ...prev, intent: data.data }));
      });

      wsClient.current.on('query_result', data => {
        // Store query results for debugging or future use
        console.log('Query result:', data.data);
      });

      wsClient.current.on('response_chunk', data => {
        setState(prev => ({ ...prev, response: prev.response + data.data }));
      });

      wsClient.current.on('response', data => {
        setState(prev => ({ ...prev, response: data.data }));
      });

      wsClient.current.on('audio_chunk_response', async data => {
        if (data.audio && audioContext.current) {
          const audioData = Uint8Array.from(atob(data.audio), c =>
            c.charCodeAt(0)
          );
          audioQueue.current.push(audioData);
          playNextAudioChunk();
        }
      });

      wsClient.current.on('audio_response', async data => {
        if (data.audio && audioContext.current) {
          const audioData = Uint8Array.from(atob(data.audio), c =>
            c.charCodeAt(0)
          );
          const audioBuffer = await audioContext.current.decodeAudioData(
            audioData.buffer
          );
          const source = audioContext.current.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(audioContext.current.destination);
          source.start();
        }
      });

      wsClient.current.on('processing_complete', () => {
        setState(prev => ({ ...prev, isProcessing: false }));
      });

      wsClient.current.on('error', data => {
        setState(prev => ({
          ...prev,
          error: data.message,
          isProcessing: false,
          isListening: false,
        }));
      });
    };

    initializeServices();

    return () => {
      if (wsClient.current) {
        wsClient.current.disconnect();
      }
      if (audioRecorder.current) {
        audioRecorder.current.cleanup();
      }
      if (audioContext.current) {
        audioContext.current.close();
      }
      if (vad.current) {
        vad.current.destroy();
      }
    };
  }, [vadEnabled, silenceThreshold, autoStop]);

  const playNextAudioChunk = useCallback(async () => {
    if (isPlayingAudio.current || audioQueue.current.length === 0 || !audioContext.current) {
      return;
    }

    isPlayingAudio.current = true;
    const audioData = audioQueue.current.shift();
    
    if (audioData) {
      try {
        const audioBuffer = await audioContext.current.decodeAudioData(audioData.buffer);
        const source = audioContext.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.current.destination);
        
        source.onended = () => {
          isPlayingAudio.current = false;
          // Play next chunk if available
          setTimeout(playNextAudioChunk, 10); // Small delay to prevent rapid-fire calls
        };
        
        source.start();
      } catch (error) {
        console.error('Error playing audio chunk:', error);
        isPlayingAudio.current = false;
        // Try next chunk if this one failed
        setTimeout(playNextAudioChunk, 10);
      }
    } else {
      isPlayingAudio.current = false;
    }
  }, []);

  const startListening = useCallback(async (triggeredByWakeWord = false) => {
    if (!audioRecorder.current) {
      setState(prev => ({ ...prev, error: 'Audio recorder not initialized' }));
      return;
    }

    if (!wsClient.current || !wsClient.current.isConnected) {
      setState(prev => ({ ...prev, error: 'Voice service not connected. Please check if the backend is running.' }));
      return;
    }

    try {
      isRecordingTriggeredByWakeWord.current = triggeredByWakeWord;
      
      setState(prev => ({
        ...prev,
        error: null,
        transcription: '',
        response: '',
        intent: null,
      }));

      // Clear audio queue for new session
      audioQueue.current = [];
      isPlayingAudio.current = false;

      wsClient.current.send('start_recording');

      // Start VAD monitoring if enabled
      if (vadEnabled && vad.current) {
        vad.current.start();
      }

      audioRecorder.current.onData(chunk => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result && typeof reader.result === 'string') {
            const base64Audio = reader.result.split(',')[1];
            wsClient.current?.send('audio_chunk', { audio: base64Audio });
          }
        };
        reader.readAsDataURL(chunk);
      });

      audioRecorder.current.start(100);
    } catch (error) {
      console.error('Failed to start listening:', error);
      setState(prev => ({ ...prev, error: 'Failed to start listening' }));
    }
  }, [vadEnabled]);

  const stopListening = useCallback(async () => {
    if (!audioRecorder.current || !wsClient.current) {
      return;
    }

    try {
      isRecordingTriggeredByWakeWord.current = false;
      
      // Pause VAD if enabled
      if (vadEnabled && vad.current) {
        vad.current.pause();
      }

      const audioBlob = await audioRecorder.current.stop();

      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result && typeof reader.result === 'string') {
          const base64Audio = reader.result.split(',')[1];
          wsClient.current?.send('stop_recording', { audio: base64Audio });
        }
      };
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error('Failed to stop listening:', error);
      setState(prev => ({ ...prev, error: 'Failed to stop listening' }));
    }
  }, [vadEnabled]);

  const setSilenceThreshold = useCallback((threshold: number) => {
    if (vad.current) {
      vad.current.setSilenceThreshold(threshold);
    }
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    setSilenceThreshold,
    vadEnabled,
  };
};