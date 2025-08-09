import { useState, useEffect } from 'react';
import { Mic, MicOff, Send, Loader2, AlertCircle, Plane, Ear, EarOff } from 'lucide-react';
import { useVoiceAssistant } from './hooks/useVoiceAssistant';
import { useWakeWord } from './hooks/useWakeWord';
import { cn } from './lib/utils';

function AppWithWakeWord() {
  const [textInput, setTextInput] = useState('');
  const [wakeWordEnabled, setWakeWordEnabled] = useState(false);
  
  const {
    isListening,
    isProcessing,
    transcription,
    response,
    intent,
    error,
    isConnected,
    startListening,
    stopListening,
    sendTextQuery,
  } = useVoiceAssistant();

  const {
    isActive: isWakeWordActive,
    isInitialized: isWakeWordInitialized,
    error: wakeWordError,
    start: startWakeWord,
    stop: stopWakeWord,
  } = useWakeWord({
    onWakeWord: () => {
      console.log('Wake word detected! Starting recording...');
      if (!isListening && !isProcessing) {
        startListening();
      }
    },
    autoStart: false,
  });

  useEffect(() => {
    if (wakeWordEnabled && isWakeWordInitialized && !isWakeWordActive) {
      startWakeWord();
    } else if (!wakeWordEnabled && isWakeWordActive) {
      stopWakeWord();
    }
  }, [wakeWordEnabled, isWakeWordInitialized]);

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) {
      sendTextQuery(textInput);
      setTextInput('');
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const toggleWakeWord = () => {
    setWakeWordEnabled(!wakeWordEnabled);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <div className="container mx-auto max-w-4xl p-4">
        <header className="text-center py-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Plane className="w-8 h-8 text-blue-400" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Flight Operations Assistant
            </h1>
          </div>
          <p className="text-slate-400">Ask about United Airlines flights using voice or text</p>
        </header>

        <div className="space-y-6">
          <div className="bg-slate-800/50 rounded-lg p-4 backdrop-blur-sm border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Connection Status</h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-3 h-3 rounded-full",
                    isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
                  )} />
                  <span className="text-sm text-slate-400">
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium">Wake Word Detection</h3>
                <span className="text-xs text-slate-500">(Say "Jarvis", "Alexa", or "Hey Google")</span>
              </div>
              <button
                onClick={toggleWakeWord}
                disabled={!isWakeWordInitialized}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  wakeWordEnabled
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-slate-600 hover:bg-slate-700"
                )}
              >
                {wakeWordEnabled ? (
                  <>
                    <Ear className="w-4 h-4" />
                    <span>Active</span>
                  </>
                ) : (
                  <>
                    <EarOff className="w-4 h-4" />
                    <span>Inactive</span>
                  </>
                )}
              </button>
            </div>

            {wakeWordError && (
              <p className="text-xs text-yellow-400 mt-2">
                Wake word detection unavailable: {wakeWordError}
              </p>
            )}
          </div>

          <div className="bg-slate-800/50 rounded-lg p-6 backdrop-blur-sm border border-slate-700">
            <h2 className="text-lg font-semibold mb-4">Voice Input</h2>
            
            <div className="flex justify-center mb-6">
              <button
                onClick={toggleListening}
                disabled={isProcessing || !isConnected}
                className={cn(
                  "relative p-8 rounded-full transition-all duration-300",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  isListening
                    ? "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/50 scale-110"
                    : "bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/50",
                  "transform hover:scale-105"
                )}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-12 h-12" />
                    <div className="absolute inset-0 rounded-full animate-ping bg-red-400 opacity-75" />
                  </>
                ) : (
                  <Mic className="w-12 h-12" />
                )}
              </button>
            </div>

            <p className="text-center text-slate-400">
              {isListening ? 'Listening... Click to stop' : 
               wakeWordEnabled && isWakeWordActive ? 'Say wake word or click to start' : 
               'Click to start speaking'}
            </p>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-6 backdrop-blur-sm border border-slate-700">
            <h2 className="text-lg font-semibold mb-4">Text Input</h2>
            
            <form onSubmit={handleTextSubmit} className="flex gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Ask about flights, gates, delays..."
                disabled={isProcessing || !isConnected}
                className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg 
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={isProcessing || !isConnected || !textInput.trim()}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg font-medium
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                         flex items-center gap-2"
              >
                {isProcessing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                Send
              </button>
            </form>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-400">Error</p>
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              </div>
            </div>
          )}

          {(transcription || response || intent) && (
            <div className="space-y-4">
              {transcription && (
                <div className="bg-slate-800/50 rounded-lg p-4 backdrop-blur-sm border border-slate-700">
                  <h3 className="text-sm font-semibold text-slate-400 mb-2">Transcription</h3>
                  <p>{transcription}</p>
                </div>
              )}

              {intent && (
                <div className="bg-slate-800/50 rounded-lg p-4 backdrop-blur-sm border border-slate-700">
                  <h3 className="text-sm font-semibold text-slate-400 mb-2">Intent Analysis</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">Intent:</span>
                      <span className="font-mono bg-slate-700 px-2 py-1 rounded">
                        {intent.intent}
                      </span>
                    </div>
                    {intent.confidence && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">Confidence:</span>
                        <span className="font-mono bg-slate-700 px-2 py-1 rounded">
                          {(intent.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    )}
                    {intent.entities && Object.keys(intent.entities).length > 0 && (
                      <div>
                        <span className="text-slate-500">Entities:</span>
                        <div className="mt-1 space-y-1">
                          {Object.entries(intent.entities).map(([key, value]) => (
                            <div key={key} className="flex items-center gap-2 ml-4">
                              <span className="text-slate-400">{key}:</span>
                              <span className="font-mono bg-slate-700 px-2 py-1 rounded text-xs">
                                {JSON.stringify(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {intent.sql && (
                      <div className="mt-2">
                        <span className="text-slate-500">SQL Query:</span>
                        <pre className="mt-1 text-xs bg-slate-900 p-2 rounded overflow-x-auto">
                          <code>{intent.sql}</code>
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {response && (
                <div className="bg-gradient-to-r from-blue-900/20 to-cyan-900/20 rounded-lg p-4 backdrop-blur-sm border border-blue-500/30">
                  <h3 className="text-sm font-semibold text-blue-400 mb-2">Response</h3>
                  <p className="text-lg">{response}</p>
                </div>
              )}
            </div>
          )}

          {isProcessing && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
              <span className="ml-3 text-slate-400">Processing your request...</span>
            </div>
          )}
        </div>

        <footer className="text-center py-6 mt-12 text-sm text-slate-500">
          <p>Powered by OpenAI Whisper, GPT-4o-mini, and Picovoice Porcupine</p>
        </footer>
      </div>
    </div>
  );
}

export default AppWithWakeWord;