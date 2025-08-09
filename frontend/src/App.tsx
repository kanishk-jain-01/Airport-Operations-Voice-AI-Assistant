import { Mic, MicOff, Loader2, AlertCircle, Plane, Activity } from 'lucide-react';
import { useVoiceAssistantWithVAD } from './hooks/useVoiceAssistantWithVAD';
import { useWakeWord } from './hooks/useWakeWord';
import { VADSettings } from './components/VADSettings';
import { cn } from './lib/utils';
import { useState } from 'react';

function App() {
  const [silenceThreshold, setSilenceThresholdState] = useState(600);
  
  const {
    isListening,
    isProcessing,
    transcription,
    response,
    intent,
    error,
    isConnected,
    vadActive,
    startListening,
    stopListening,
    setSilenceThreshold,
    vadEnabled,
  } = useVoiceAssistantWithVAD({
    enabled: true,
    silenceThreshold,
    autoStop: true,
  });

  // Wake word integration
  const wakeWord = useWakeWord({
    autoStart: true,
    onWakeWord: () => {
      if (!isListening && !isProcessing) {
        startListening(true); // Pass true to indicate wake word triggered
      }
    }
  });

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening(false);
    }
  };

  const handleThresholdChange = (threshold: number) => {
    setSilenceThresholdState(threshold);
    setSilenceThreshold(threshold);
  };

  return (
    <div className='min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white'>
      <div className='container mx-auto max-w-4xl p-4'>
        <header className='text-center py-8'>
          <div className='flex items-center justify-center gap-3 mb-2'>
            <Plane className='w-8 h-8 text-blue-400' />
            <h1 className='text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent'>
              Flight Operations Assistant
            </h1>
          </div>
          <p className='text-slate-400'>
            Ask about United Airlines flights using voice commands
          </p>
        </header>

        <div className='space-y-6'>
          <div className='bg-slate-800/50 rounded-lg p-4 backdrop-blur-sm border border-slate-700'>
            <div className='flex items-center justify-between mb-4'>
              <h2 className='text-lg font-semibold'>Status</h2>
              <div className='flex items-center gap-4'>
                <VADSettings
                  silenceThreshold={silenceThreshold}
                  onThresholdChange={handleThresholdChange}
                  vadEnabled={vadEnabled}
                />
                <div className='space-y-2'>
                <div className='flex items-center gap-2'>
                  <div
                    className={cn(
                      'w-3 h-3 rounded-full',
                      isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                    )}
                  />
                  <span className='text-sm text-slate-400'>
                    WebSocket: {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                <div className='flex items-center gap-2'>
                  <div
                    className={cn(
                      'w-3 h-3 rounded-full',
                      wakeWord.isInitialized && !wakeWord.error
                        ? wakeWord.isActive 
                          ? 'bg-blue-500 animate-pulse' 
                          : 'bg-yellow-500'
                        : 'bg-red-500'
                    )}
                  />
                  <span className='text-sm text-slate-400'>
                    Wake Word: {
                      wakeWord.error 
                        ? 'Error' 
                        : wakeWord.isInitialized 
                          ? wakeWord.isActive ? 'Listening' : 'Ready'
                          : 'Initializing'
                    }
                  </span>
                </div>
                <div className='flex items-center gap-2'>
                  <Activity 
                    className={cn(
                      'w-3 h-3',
                      vadActive ? 'text-green-500' : 'text-slate-500'
                    )}
                  />
                  <span className='text-sm text-slate-400'>
                    VAD: {vadActive ? 'Speaking' : 'Silent'}
                  </span>
                </div>
                </div>
              </div>
            </div>
            {wakeWord.error && (
              <div className='text-xs text-red-400 mt-2 p-2 bg-red-900/20 rounded border border-red-500/30'>
                Wake Word Error: {wakeWord.error}
              </div>
            )}
          </div>

          <div className='bg-slate-800/50 rounded-lg p-6 backdrop-blur-sm border border-slate-700'>
            <h2 className='text-lg font-semibold mb-4'>Voice Input</h2>

            <div className='flex justify-center mb-6'>
              <button
                onClick={toggleListening}
                disabled={isProcessing || !isConnected}
                className={cn(
                  'relative p-8 rounded-full transition-all duration-300',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  isListening
                    ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/50 scale-110'
                    : 'bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/50',
                  'transform hover:scale-105'
                )}
              >
                {isListening ? (
                  <>
                    <MicOff className='w-12 h-12' />
                    <div className='absolute inset-0 rounded-full animate-ping bg-red-400 opacity-75' />
                  </>
                ) : (
                  <Mic className='w-12 h-12' />
                )}
              </button>
            </div>

            <p className='text-center text-slate-400'>
              {isListening
                ? vadActive 
                  ? 'Listening... (Speaking detected)'
                  : 'Listening... (Waiting for speech)'
                : 'Click to start speaking or say wake word'}
            </p>
          </div>


          {error && (
            <div className='bg-red-900/20 border border-red-500/50 rounded-lg p-4 backdrop-blur-sm'>
              <div className='flex items-start gap-3'>
                <AlertCircle className='w-5 h-5 text-red-400 mt-0.5' />
                <div>
                  <p className='font-semibold text-red-400'>Error</p>
                  <p className='text-sm text-red-300'>{error}</p>
                </div>
              </div>
            </div>
          )}

          {(transcription || response || intent) && (
            <div className='space-y-4'>
              {transcription && (
                <div className='bg-slate-800/50 rounded-lg p-4 backdrop-blur-sm border border-slate-700'>
                  <h3 className='text-sm font-semibold text-slate-400 mb-2'>
                    Transcription
                  </h3>
                  <p>{transcription}</p>
                </div>
              )}

              {intent && (
                <div className='bg-slate-800/50 rounded-lg p-4 backdrop-blur-sm border border-slate-700'>
                  <h3 className='text-sm font-semibold text-slate-400 mb-2'>
                    Intent Analysis
                  </h3>
                  <div className='space-y-2 text-sm'>
                    <div className='flex items-center gap-2'>
                      <span className='text-slate-500'>Intent:</span>
                      <span className='font-mono bg-slate-700 px-2 py-1 rounded'>
                        {intent.intent}
                      </span>
                    </div>
                    {intent.confidence && (
                      <div className='flex items-center gap-2'>
                        <span className='text-slate-500'>Confidence:</span>
                        <span className='font-mono bg-slate-700 px-2 py-1 rounded'>
                          {(intent.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    )}
                    {intent.entities &&
                      Object.keys(intent.entities).length > 0 && (
                        <div>
                          <span className='text-slate-500'>Entities:</span>
                          <div className='mt-1 space-y-1'>
                            {Object.entries(intent.entities).map(
                              ([key, value]) => (
                                <div
                                  key={key}
                                  className='flex items-center gap-2 ml-4'
                                >
                                  <span className='text-slate-400'>{key}:</span>
                                  <span className='font-mono bg-slate-700 px-2 py-1 rounded text-xs'>
                                    {JSON.stringify(value)}
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              )}

              {response && (
                <div className='bg-gradient-to-r from-blue-900/20 to-cyan-900/20 rounded-lg p-4 backdrop-blur-sm border border-blue-500/30'>
                  <h3 className='text-sm font-semibold text-blue-400 mb-2'>
                    Response
                  </h3>
                  <p className='text-lg'>{response}</p>
                </div>
              )}
            </div>
          )}

          {isProcessing && (
            <div className='flex items-center justify-center py-8'>
              <Loader2 className='w-8 h-8 animate-spin text-blue-400' />
              <span className='ml-3 text-slate-400'>
                Processing your request...
              </span>
            </div>
          )}
        </div>

        <footer className='text-center py-6 mt-12 text-sm text-slate-500'>
          <p>Powered by OpenAI Whisper, GPT-4o-mini, and Picovoice Porcupine</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
