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
        <header className='text-center py-12 md:py-16 animate-fade-in'>
          <div className='inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8'>
            <Sparkles className='w-4 h-4 text-primary' />
            <span className='text-sm font-medium text-muted-foreground'>AI-Powered Voice Assistant</span>
          </div>
          
          <div className='flex items-center justify-center gap-6 mb-6'>
            <div className='relative'>
              <Plane className='w-12 h-12 text-primary' />
              <div className='absolute -inset-2 bg-primary/20 blur-xl rounded-full animate-pulse' />
            </div>
            <h1 className='text-5xl md:text-6xl lg:text-7xl font-bold text-gradient leading-tight'>
              Flight Operations Assistant
            </h1>
          </div>
          <p className='text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed'>
            Your intelligent voice companion for United Airlines flight information. 
            Ask about flights, gates, delays, and more using natural speech.
          </p>
        </header>

        <div className='space-y-8'>
          {/* Status Bar */}
          <Card className='glass border-white/10 overflow-hidden animate-fade-up'>
            <CardHeader className='pb-4'>
              <div className='flex items-center justify-between'>
                <CardTitle className='text-lg'>System Status</CardTitle>
                <VADSettings
                  silenceThreshold={silenceThreshold}
                  onThresholdChange={handleThresholdChange}
                  vadEnabled={vadEnabled}
                />
              </div>
            </CardHeader>
            <CardContent className='pb-6'>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
                {/* WebSocket Status */}
                <div className='flex items-center gap-4'>
                  <div className={cn(
                    'p-3 rounded-lg',
                    isConnected ? 'bg-green-500/10' : 'bg-red-500/10'
                  )}>
                    {isConnected ? (
                      <Wifi className='w-5 h-5 text-green-500' />
                    ) : (
                      <WifiOff className='w-5 h-5 text-red-500' />
                    )}
                  </div>
                  <div>
                    <p className='text-sm text-muted-foreground'>Connection</p>
                    <p className='text-base font-medium'>
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </p>
                  </div>
                </div>

                {/* Wake Word Status */}
                <div className='flex items-center gap-4'>
                  <div className={cn(
                    'p-3 rounded-lg',
                    wakeWord.isInitialized && !wakeWord.error
                      ? wakeWord.isActive 
                        ? 'bg-blue-500/10' 
                        : 'bg-yellow-500/10'
                      : 'bg-red-500/10'
                  )}>
                    <Bot className={cn(
                      'w-5 h-5',
                      wakeWord.isInitialized && !wakeWord.error
                        ? wakeWord.isActive 
                          ? 'text-blue-500' 
                          : 'text-yellow-500'
                        : 'text-red-500'
                    )} />
                  </div>
                  <div>
                    <p className='text-sm text-muted-foreground'>Wake Word</p>
                    <p className='text-base font-medium'>
                      {wakeWord.error 
                        ? 'Error' 
                        : wakeWord.isInitialized 
                          ? wakeWord.isActive ? 'Listening' : 'Ready'
                          : 'Initializing'}
                    </p>
                  </div>
                </div>

                {/* VAD Status */}
                <div className='flex items-center gap-4'>
                  <div className={cn(
                    'p-3 rounded-lg',
                    vadActive ? 'bg-green-500/10' : 'bg-muted'
                  )}>
                    <Activity className={cn(
                      'w-5 h-5',
                      vadActive ? 'text-green-500' : 'text-muted-foreground'
                    )} />
                  </div>
                  <div>
                    <p className='text-sm text-muted-foreground'>Voice Activity</p>
                    <p className='text-base font-medium'>
                      {vadActive ? 'Speaking' : 'Silent'}
                    </p>
                  </div>
                </div>
              </div>
              
              {wakeWord.error && (
                <Alert variant="destructive" className='mt-6 bg-red-500/5 border-red-500/20'>
                  <AlertCircle className="h-5 w-5" />
                  <AlertDescription className='text-sm'>
                    Wake Word Error: {wakeWord.error}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Voice Control */}
          <Card className='glass border-white/10 overflow-hidden animate-fade-up' style={{ animationDelay: '100ms' }}>
            <CardHeader className='pb-6'>
              <CardTitle className='text-xl'>Voice Control</CardTitle>
              <CardDescription className='text-base'>
                Click the button or say the wake word to start
              </CardDescription>
            </CardHeader>
            <CardContent className='flex flex-col items-center py-8'>
              <div className='relative mb-8'>
                <Button
                  onClick={toggleListening}
                  disabled={isProcessing || !isConnected}
                  variant="glass"
                  size="xl"
                  className={cn(
                    'relative h-32 w-32 rounded-full transition-all duration-300',
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
                    <MicOff className='relative z-10 w-14 h-14 text-white' />
                  ) : (
                    <Mic className='relative z-10 w-14 h-14 text-white' />
                  )}
                  
                  {isListening && (
                    <>
                      <div className='absolute inset-0 rounded-full bg-red-400 animate-ping opacity-75' />
                      <div className='absolute -inset-6 rounded-full bg-red-500/20 animate-pulse' />
                    </>
                  )}
                </Button>
              </div>

              {/* Voice activity indicator */}
              {isListening && vadActive && (
                <div className='flex gap-1 mb-4'>
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className='w-1.5 h-5 bg-primary rounded-full animate-voice-wave'
                      style={{ animationDelay: `${i * 100}ms` }}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className='glass border-red-500/20 animate-fade-in'>
              <AlertCircle className="h-5 w-5" />
              <AlertTitle className='text-lg'>Error</AlertTitle>
              <AlertDescription className='text-base'>{error}</AlertDescription>
            </Alert>
          )}

          {/* Conversation Display */}
          {(transcription || response || intent) && (
            <div className='space-y-6 animate-fade-up' style={{ animationDelay: '200ms' }}>
              {transcription && (
                <Card className='glass border-white/10 overflow-hidden'>
                  <CardHeader className='pb-4'>
                    <div className='flex items-center gap-3'>
                      <User className='w-5 h-5 text-muted-foreground' />
                      <CardTitle className='text-base'>Your Message</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className='text-lg leading-relaxed'>{transcription}</p>
                  </CardContent>
                </Card>
              )}

              {intent && (
                <Card className='glass border-white/10 overflow-hidden'>
                  <CardHeader className='pb-4'>
                    <CardTitle className='text-base'>Intent Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className='space-y-4'>
                      <div className='flex items-center gap-3'>
                        <Badge variant="outline" className='font-mono text-sm px-3 py-1'>
                          {intent.intent}
                        </Badge>
                        {intent.confidence && (
                          <Badge variant="secondary" className='text-sm px-3 py-1'>
                            {(intent.confidence * 100).toFixed(0)}% confidence
                          </Badge>
                        )}
                      </div>
                      
                      {intent.entities && Object.keys(intent.entities).length > 0 && (
                        <div className='space-y-3'>
                          <p className='text-sm text-muted-foreground font-medium'>Entities</p>
                          <div className='flex flex-wrap gap-2'>
                            {Object.entries(intent.entities).map(([key, value]) => (
                              <div key={key} className='inline-flex items-center gap-2'>
                                <span className='text-sm text-muted-foreground'>{key}:</span>
                                <Badge variant="secondary" className='text-sm font-mono px-3 py-1'>
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
                  <CardHeader className='pb-4'>
                    <div className='flex items-center gap-3'>
                      <Bot className='w-5 h-5 text-primary' />
                      <CardTitle className='text-base'>Assistant Response</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className='text-lg leading-relaxed'>{response}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Processing Indicator */}
          {isProcessing && (
            <Card className='glass border-white/10 animate-fade-in'>
              <CardContent className='py-10'>
                <div className='flex flex-col items-center justify-center space-y-4'>
                  <Loader2 className='w-10 h-10 animate-spin text-primary' />
                  <p className='text-base text-muted-foreground'>Processing your request...</p>
                  <div className='w-56 h-2 bg-muted rounded-full overflow-hidden'>
                    <div className='h-full bg-primary rounded-full shimmer' />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer */}
        <footer className='text-center py-12 mt-16'>
          <Separator className='mb-10 bg-white/5' />
          <div className='space-y-4'>
            <p className='text-sm text-muted-foreground'>
              Powered by OpenAI Whisper, GPT-4o-mini, and Picovoice Porcupine
            </p>
            <div className='flex items-center justify-center gap-3 text-sm text-muted-foreground'>
              <Badge variant="outline" className='text-sm px-3 py-1'>
                <ChevronRight className='w-4 h-4 mr-2' />
                Voice Recognition
              </Badge>
              <Badge variant="outline" className='text-sm px-3 py-1'>
                <ChevronRight className='w-4 h-4 mr-2' />
                Natural Language
              </Badge>
              <Badge variant="outline" className='text-sm px-3 py-1'>
                <ChevronRight className='w-4 h-4 mr-2' />
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