import { useState, useEffect, useCallback, useRef } from 'react';
import { WebSocketClient } from '../services/websocket';
import { AudioRecorder } from '../services/audioRecorder';

interface VoiceAssistantState {
  isListening: boolean;
  isProcessing: boolean;
  transcription: string;
  response: string;
  intent: any;
  error: string | null;
  isConnected: boolean;
}

export const useVoiceAssistant = () => {
  const [state, setState] = useState<VoiceAssistantState>({
    isListening: false,
    isProcessing: false,
    transcription: '',
    response: '',
    intent: null,
    error: null,
    isConnected: false,
  });

  const wsClient = useRef<WebSocketClient | null>(null);
  const audioRecorder = useRef<AudioRecorder | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const audioQueue = useRef<Uint8Array[]>([]);
  const isPlayingAudio = useRef<boolean>(false);

  useEffect(() => {
    const initializeServices = async () => {
      try {
        wsClient.current = new WebSocketClient('ws://localhost:8080');
        audioRecorder.current = new AudioRecorder();
        audioContext.current = new AudioContext();

        await wsClient.current.connect();
        await audioRecorder.current.initialize();

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
    };
  }, []);

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

  const startListening = useCallback(async () => {
    if (!audioRecorder.current || !wsClient.current) {
      setState(prev => ({ ...prev, error: 'Services not initialized' }));
      return;
    }

    try {
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
  }, []);

  const stopListening = useCallback(async () => {
    if (!audioRecorder.current || !wsClient.current) {
      return;
    }

    try {
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
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
  };
};
