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

  useEffect(() => {
    const initializeServices = async () => {
      try {
        wsClient.current = new WebSocketClient('ws://localhost:8080');
        audioRecorder.current = new AudioRecorder();
        audioContext.current = new AudioContext();

        await wsClient.current.connect();
        await audioRecorder.current.initialize();

        // Initialize VAD if enabled
        if (vadEnabled) {
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

          // Initialize VAD with the same stream used by the audio recorder
          await vad.current.initialize();
        }

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

        wsClient.current.on('response', data => {
          setState(prev => ({ ...prev, response: data.data }));
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

        setState(prev => ({ ...prev, isConnected: true }));
      } catch (error) {
        console.error('Failed to initialize services:', error);
        setState(prev => ({
          ...prev,
          error: 'Failed to initialize voice assistant',
        }));
      }
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

  const startListening = useCallback(async (triggeredByWakeWord = false) => {
    if (!audioRecorder.current || !wsClient.current) {
      setState(prev => ({ ...prev, error: 'Services not initialized' }));
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