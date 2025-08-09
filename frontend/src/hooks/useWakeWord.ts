import { useState, useEffect, useRef } from 'react';
import { WakeWordDetector } from '../services/wakeWord';

interface UseWakeWordOptions {
  accessKey?: string;
  onWakeWord?: () => void;
  autoStart?: boolean;
}

export const useWakeWord = (options: UseWakeWordOptions = {}) => {
  const [isActive, setIsActive] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const detectorRef = useRef<WakeWordDetector | null>(null);

  useEffect(() => {
    const initializeDetector = async () => {
      const accessKey =
        options.accessKey || import.meta.env.VITE_PICOVOICE_ACCESS_KEY || '';

      if (!accessKey) {
        setError('Picovoice access key not provided');
        return;
      }

      try {
        detectorRef.current = new WakeWordDetector();
        await detectorRef.current.initialize(accessKey);

        if (options.onWakeWord) {
          detectorRef.current.onWakeWord(options.onWakeWord);
        }

        setIsInitialized(true);
        setError(null);

        if (options.autoStart) {
          await detectorRef.current.start();
          setIsActive(true);
        }
      } catch (err) {
        console.error('Failed to initialize wake word detector:', err);
        setError('Failed to initialize wake word detection');
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
