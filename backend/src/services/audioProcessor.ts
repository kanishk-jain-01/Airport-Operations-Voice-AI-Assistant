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
      
      const transcription = await this.openaiService.transcribeAudio(audioBuffer);
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
        audioStream
      };
    } finally {
      this.isProcessing = false;
      this.clearAudioChunks();
    }
  }

  async processTextQuery(text: string): Promise<{
    intent: any;
    queryResult: any[];
    response: string;
    audioStream?: any;
  }> {
    const intent = await this.openaiService.extractIntent(text);
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
      text,
      intent
    );
    console.log('Response:', response);

    const audioStream = await this.openaiService.textToSpeech(response);

    return {
      intent,
      queryResult,
      response,
      audioStream
    };
  }
}