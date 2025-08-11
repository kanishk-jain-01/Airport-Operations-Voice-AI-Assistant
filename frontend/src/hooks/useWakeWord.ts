import { useState, useEffect, useRef } from 'react';
import { WakeWordDetector } from '../services/wakeWord';

interface UseWakeWordOptions {
  accessKey?: string; // Kept for compatibility, but not used with Web Speech API
  onWakeWord?: () => void;
  autoStart?: boolean;
  wakeWords?: string[]; // New option to customize wake words
}

export const useWakeWord = (options: UseWakeWordOptions = {}) => {
  const [isActive, setIsActive] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const detectorRef = useRef<WakeWordDetector | null>(null);

  useEffect(() => {
    const initializeDetector = async () => {
      try {
        detectorRef.current = new WakeWordDetector();
        
        // Set custom wake words if provided
        if (options.wakeWords) {
          detectorRef.current.setWakeWords(options.wakeWords);
        }
        
        await detectorRef.current.initialize();

        if (options.onWakeWord) {
          detectorRef.current.onWakeWord(options.onWakeWord);
        }

        setIsInitialized(true);
        setError(null);

        if (options.autoStart) {
          // Small delay to ensure initialization is complete and state has updated
          setTimeout(async () => {
            try {
              if (detectorRef.current) {
                await detectorRef.current.start();
                setIsActive(true);
              }
            } catch (err) {
              console.error('Failed to auto-start wake word detector:', err);
              setError('Failed to auto-start wake word detection. Please ensure microphone permissions are granted.');
            }
          }, 250);
        }
      } catch (err) {
        console.error('Failed to initialize wake word detector:', err);
        setError('Failed to initialize wake word detection. Web Speech API may not be supported in this browser.');
        setIsInitialized(false);
      }
    };

    initializeDetector();

    return () => {
      if (detectorRef.current) {
        detectorRef.current.cleanup();
      }
    };
  }, []);

  const start = async () => {
    if (!detectorRef.current || !isInitialized) {
      setError('Wake word detector not initialized');
      return;
    }

    if (isActive) {
      return;
    }

    try {
      await detectorRef.current.start();
      setIsActive(true);
      setError(null);
    } catch (err) {
      console.error('Failed to start wake word detection:', err);
      setError('Failed to start wake word detection');
    }
  };

  const stop = async () => {
    if (!detectorRef.current || !isInitialized) {
      return;
    }

    if (!isActive) {
      return;
    }

    try {
      await detectorRef.current.stop();
      setIsActive(false);
      setError(null);
    } catch (err) {
      console.error('Failed to stop wake word detection:', err);
      setError('Failed to stop wake word detection');
    }
  };

  return {
    isActive,
    isInitialized,
    error,
    start,
    stop,
  };
};
