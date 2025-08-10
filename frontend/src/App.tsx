import { Mic, MicOff, Loader2, AlertCircle, Plane, Activity, Wifi, WifiOff, Sparkles, ChevronRight, Bot, User } from 'lucide-react';
import { useVoiceAssistantWithVAD } from './hooks/useVoiceAssistantWithVAD';
import { useWakeWord } from './hooks/useWakeWord';
import { VADSettings } from './components/VADSettings';
import { cn } from './lib/utils';
import { useState } from 'react';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from './components/ui/alert';
import { Separator } from './components/ui/separator';

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
    <div className='min-h-screen bg-background'>
      {/* Animated background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-600/5 via-background to-cyan-600/5 animate-gradient" />
      
      {/* Grid pattern overlay */}
      <div className="fixed inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='60' height='60' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 60 0 L 0 0 0 60' fill='none' stroke='white' stroke-width='0.5' opacity='0.5'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23grid)'/%3E%3C/svg%3E")`
        }}
      />

      <div className='relative container mx-auto max-w-5xl p-4 md:p-8'>
        {/* Header */}
        <header className='text-center py-8 md:py-12 animate-fade-in'>
          <div className='inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass mb-6'>
            <Sparkles className='w-3 h-3 text-primary' />
            <span className='text-xs font-medium text-muted-foreground'>AI-Powered Voice Assistant</span>
          </div>
          
          <div className='flex items-center justify-center gap-4 mb-3'>
            <div className='relative'>
              <Plane className='w-10 h-10 text-primary' />
              <div className='absolute -inset-2 bg-primary/20 blur-xl rounded-full animate-pulse' />
            </div>
            <h1 className='text-4xl md:text-5xl font-bold text-gradient'>
              Flight Operations Assistant
            </h1>
          </div>
          <p className='text-muted-foreground max-w-2xl mx-auto'>
            Your intelligent voice companion for United Airlines flight information. 
            Ask about flights, gates, delays, and more using natural speech.
          </p>
        </header>

        <div className='space-y-6'>
          {/* Status Bar */}
          <Card className='glass border-white/10 overflow-hidden animate-fade-up'>
            <CardHeader className='pb-3'>
              <div className='flex items-center justify-between'>
                <CardTitle className='text-base'>System Status</CardTitle>
                <VADSettings
                  silenceThreshold={silenceThreshold}
                  onThresholdChange={handleThresholdChange}
                  vadEnabled={vadEnabled}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                {/* WebSocket Status */}
                <div className='flex items-center gap-3'>
                  <div className={cn(
                    'p-2 rounded-lg',
                    isConnected ? 'bg-green-500/10' : 'bg-red-500/10'
                  )}>
                    {isConnected ? (
                      <Wifi className='w-4 h-4 text-green-500' />
                    ) : (
                      <WifiOff className='w-4 h-4 text-red-500' />
                    )}
                  </div>
                  <div>
                    <p className='text-xs text-muted-foreground'>Connection</p>
                    <p className='text-sm font-medium'>
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </p>
                  </div>
                </div>

                {/* Wake Word Status */}
                <div className='flex items-center gap-3'>
                  <div className={cn(
                    'p-2 rounded-lg',
                    wakeWord.isInitialized && !wakeWord.error
                      ? wakeWord.isActive 
                        ? 'bg-blue-500/10' 
                        : 'bg-yellow-500/10'
                      : 'bg-red-500/10'
                  )}>
                    <Bot className={cn(
                      'w-4 h-4',
                      wakeWord.isInitialized && !wakeWord.error
                        ? wakeWord.isActive 
                          ? 'text-blue-500' 
                          : 'text-yellow-500'
                        : 'text-red-500'
                    )} />
                  </div>
                  <div>
                    <p className='text-xs text-muted-foreground'>Wake Word</p>
                    <p className='text-sm font-medium'>
                      {wakeWord.error 
                        ? 'Error' 
                        : wakeWord.isInitialized 
                          ? wakeWord.isActive ? 'Listening' : 'Ready'
                          : 'Initializing'}
                    </p>
                  </div>
                </div>

                {/* VAD Status */}
                <div className='flex items-center gap-3'>
                  <div className={cn(
                    'p-2 rounded-lg',
                    vadActive ? 'bg-green-500/10' : 'bg-muted'
                  )}>
                    <Activity className={cn(
                      'w-4 h-4',
                      vadActive ? 'text-green-500' : 'text-muted-foreground'
                    )} />
                  </div>
                  <div>
                    <p className='text-xs text-muted-foreground'>Voice Activity</p>
                    <p className='text-sm font-medium'>
                      {vadActive ? 'Speaking' : 'Silent'}
                    </p>
                  </div>
                </div>
              </div>
              
              {wakeWord.error && (
                <Alert variant="destructive" className='mt-4 bg-red-500/5 border-red-500/20'>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className='text-xs'>
                    Wake Word Error: {wakeWord.error}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Voice Control */}
          <Card className='glass border-white/10 overflow-hidden animate-fade-up' style={{ animationDelay: '100ms' }}>
            <CardHeader>
              <CardTitle>Voice Control</CardTitle>
              <CardDescription>
                Click the button or say the wake word to start
              </CardDescription>
            </CardHeader>
            <CardContent className='flex flex-col items-center space-y-6'>
              <div className='relative'>
                <Button
                  onClick={toggleListening}
                  disabled={isProcessing || !isConnected}
                  variant="glass"
                  size="xl"
                  className={cn(
                    'relative h-24 w-24 rounded-full transition-all duration-300',
                    'hover:scale-105 active:scale-95',
                    isListening && 'animate-pulse-glow'
                  )}
                >
                  <div className={cn(
                    'absolute inset-0 rounded-full transition-all duration-300',
                    isListening 
                      ? 'bg-gradient-to-br from-red-500 to-pink-500 opacity-90'
                      : 'bg-gradient-to-br from-blue-500 to-cyan-500 opacity-90'
                  )} />
                  
                  {isListening ? (
                    <MicOff className='relative z-10 w-10 h-10 text-white' />
                  ) : (
                    <Mic className='relative z-10 w-10 h-10 text-white' />
                  )}
                  
                  {isListening && (
                    <>
                      <div className='absolute inset-0 rounded-full bg-red-400 animate-ping opacity-75' />
                      <div className='absolute -inset-4 rounded-full bg-red-500/20 animate-pulse' />
                    </>
                  )}
                </Button>

                {/* Voice activity indicator */}
                {isListening && vadActive && (
                  <div className='absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-1'>
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className='w-1 h-4 bg-primary rounded-full animate-voice-wave'
                        style={{ animationDelay: `${i * 100}ms` }}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className='text-center space-y-2'>
                <p className='text-sm text-muted-foreground'>
                  {isListening
                    ? vadActive 
                      ? 'Listening... Speaking detected'
                      : 'Listening... Waiting for speech'
                    : 'Click to start or say wake word'}
                </p>
                
                {isListening && (
                  <Badge variant="secondary" className='animate-fade-in'>
                    <Activity className='w-3 h-3 mr-1' />
                    Recording Active
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className='glass border-red-500/20 animate-fade-in'>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Conversation Display */}
          {(transcription || response || intent) && (
            <div className='space-y-4 animate-fade-up' style={{ animationDelay: '200ms' }}>
              {transcription && (
                <Card className='glass border-white/10 overflow-hidden'>
                  <CardHeader className='pb-3'>
                    <div className='flex items-center gap-2'>
                      <User className='w-4 h-4 text-muted-foreground' />
                      <CardTitle className='text-sm'>Your Message</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className='text-base'>{transcription}</p>
                  </CardContent>
                </Card>
              )}

              {intent && (
                <Card className='glass border-white/10 overflow-hidden'>
                  <CardHeader className='pb-3'>
                    <CardTitle className='text-sm'>Intent Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className='space-y-3'>
                      <div className='flex items-center gap-2'>
                        <Badge variant="outline" className='font-mono'>
                          {intent.intent}
                        </Badge>
                        {intent.confidence && (
                          <Badge variant="secondary" className='text-xs'>
                            {(intent.confidence * 100).toFixed(0)}% confidence
                          </Badge>
                        )}
                      </div>
                      
                      {intent.entities && Object.keys(intent.entities).length > 0 && (
                        <div className='space-y-2'>
                          <p className='text-xs text-muted-foreground font-medium'>Entities</p>
                          <div className='flex flex-wrap gap-2'>
                            {Object.entries(intent.entities).map(([key, value]) => (
                              <div key={key} className='inline-flex items-center gap-1'>
                                <span className='text-xs text-muted-foreground'>{key}:</span>
                                <Badge variant="secondary" className='text-xs font-mono'>
                                  {JSON.stringify(value)}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {response && (
                <Card className='glass border-primary/20 bg-gradient-to-br from-primary/5 to-cyan-500/5 overflow-hidden'>
                  <CardHeader className='pb-3'>
                    <div className='flex items-center gap-2'>
                      <Bot className='w-4 h-4 text-primary' />
                      <CardTitle className='text-sm'>Assistant Response</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className='text-base leading-relaxed'>{response}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Processing Indicator */}
          {isProcessing && (
            <Card className='glass border-white/10 animate-fade-in'>
              <CardContent className='py-8'>
                <div className='flex flex-col items-center justify-center space-y-3'>
                  <Loader2 className='w-8 h-8 animate-spin text-primary' />
                  <p className='text-sm text-muted-foreground'>Processing your request...</p>
                  <div className='w-48 h-1 bg-muted rounded-full overflow-hidden'>
                    <div className='h-full bg-primary rounded-full shimmer' />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer */}
        <footer className='text-center py-8 mt-12'>
          <Separator className='mb-8 bg-white/5' />
          <div className='space-y-2'>
            <p className='text-xs text-muted-foreground'>
              Powered by OpenAI Whisper, GPT-4o-mini, and Picovoice Porcupine
            </p>
            <div className='flex items-center justify-center gap-2 text-xs text-muted-foreground'>
              <Badge variant="outline" className='text-xs'>
                <ChevronRight className='w-3 h-3 mr-1' />
                Voice Recognition
              </Badge>
              <Badge variant="outline" className='text-xs'>
                <ChevronRight className='w-3 h-3 mr-1' />
                Natural Language
              </Badge>
              <Badge variant="outline" className='text-xs'>
                <ChevronRight className='w-3 h-3 mr-1' />
                Real-time Processing
              </Badge>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;