import { OpenAIService } from './openai';
import { db } from '../database/db';

export class AudioProcessor {
  private openaiService: OpenAIService;
  private audioChunks: Buffer[] = [];
  private isProcessing = false;

  constructor(openaiApiKey: string) {
    this.openaiService = new OpenAIService(openaiApiKey);
  }

  addAudioChunk(chunk: Buffer): void {
    this.audioChunks.push(chunk);
  }

  clearAudioChunks(): void {
    this.audioChunks = [];
  }

  async processAudioPipeline(): Promise<{
    transcription: string;
    intent: any;
    queryResult: any[];
    response: string;
    audioStream?: any;
  }> {
    if (this.isProcessing) {
      throw new Error('Already processing audio');
    }

    this.isProcessing = true;

    try {
      const audioBuffer = Buffer.concat(this.audioChunks);

      const transcription =
        await this.openaiService.transcribeAudio(audioBuffer);
      console.log('Transcription:', transcription);

      const intent = await this.openaiService.extractIntent(transcription);
      console.log('Intent:', intent);

      let queryResult: any[] = [];
      if (intent.sql) {
        try {
          queryResult = await db.query(intent.sql);
          console.log('Query result:', queryResult);
        } catch (dbError) {
          console.error('Database query error:', dbError);
          queryResult = [];
        }
      }

      const response = await this.openaiService.generateResponse(
        queryResult,
        transcription,
        intent
      );
      console.log('Response:', response);

      const audioStream = await this.openaiService.textToSpeech(response);

      return {
        transcription,
        intent,
        queryResult,
        response,
        audioStream,
      };
    } finally {
      this.isProcessing = false;
      this.clearAudioChunks();
    }
  }

  async *processAudioPipelineStream(): AsyncGenerator<{
    type: 'transcription' | 'intent' | 'query_result' | 'response_chunk' | 'response_complete' | 'audio_stream' | 'audio_chunk';
    data: any;
  }, void, unknown> {
    if (this.isProcessing) {
      throw new Error('Already processing audio');
    }

    this.isProcessing = true;

    try {
      const audioBuffer = Buffer.concat(this.audioChunks);

      // Transcription
      const transcription = await this.openaiService.transcribeAudio(audioBuffer);
      console.log('Transcription:', transcription);
      yield { type: 'transcription', data: transcription };

      // Intent extraction
      const intent = await this.openaiService.extractIntent(transcription);
      console.log('Intent:', intent);
      yield { type: 'intent', data: intent };

      // Database query
      let queryResult: any[] = [];
      if (intent.sql) {
        try {
          queryResult = await db.query(intent.sql);
          console.log('Query result:', queryResult);
        } catch (dbError) {
          console.error('Database query error:', dbError);
          queryResult = [];
        }
      }
      yield { type: 'query_result', data: queryResult };

      // Streaming response generation with incremental TTS
      let fullResponse = '';
      let pendingText = '';
      
      for await (const chunk of this.openaiService.generateResponseStream(
        queryResult,
        transcription,
        intent
      )) {
        fullResponse += chunk;
        pendingText += chunk;
        yield { type: 'response_chunk', data: chunk };

        // Check if we have a complete sentence or phrase to convert to speech
        if (this.isCompleteSentence(pendingText)) {
          try {
            const audioBuffer = await this.openaiService.textToSpeechChunk(pendingText.trim());
            yield { type: 'audio_chunk', data: audioBuffer };
            console.log('Generated TTS for:', pendingText.trim());
            pendingText = '';
          } catch (ttsError) {
            console.error('TTS chunk error:', ttsError);
            // Continue processing even if TTS fails for a chunk
          }
        }
      }
      
      // Handle any remaining text that didn't form a complete sentence
      if (pendingText.trim()) {
        try {
          const audioBuffer = await this.openaiService.textToSpeechChunk(pendingText.trim());
          yield { type: 'audio_chunk', data: audioBuffer };
          console.log('Generated TTS for remaining text:', pendingText.trim());
        } catch (ttsError) {
          console.error('TTS remaining text error:', ttsError);
        }
      }
      
      console.log('Complete Response:', fullResponse);
      yield { type: 'response_complete', data: fullResponse };

      // Final fallback - complete TTS if no chunks were sent
      if (!fullResponse.includes('.') && !fullResponse.includes('!') && !fullResponse.includes('?')) {
        const audioStream = await this.openaiService.textToSpeech(fullResponse);
        yield { type: 'audio_stream', data: audioStream };
      }

    } finally {
      this.isProcessing = false;
      this.clearAudioChunks();
    }
  }

  private isCompleteSentence(text: string): boolean {
    // Check for sentence endings or sufficient length for meaningful chunks
    const sentenceEnders = /[.!?]\s*$/;
    const hasEnder = sentenceEnders.test(text.trim());
    
    // Also trigger on commas if we have a long enough phrase (for better responsiveness)
    const longPhrase = text.trim().length > 50 && /[,;]\s*$/.test(text.trim());
    
    return hasEnder || longPhrase;
  }

}
