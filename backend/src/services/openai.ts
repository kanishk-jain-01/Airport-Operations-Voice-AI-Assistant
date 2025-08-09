import OpenAI from 'openai';
import { Readable } from 'stream';

export class OpenAIService {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async transcribeAudio(audioBuffer: Buffer): Promise<string> {
    try {
      const file = new File([audioBuffer], 'audio.webm', {
        type: 'audio/webm',
      });

      const transcription = await this.client.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        language: 'en',
      });

      return transcription.text;
    } catch (error) {
      console.error('Transcription error:', error);
      throw error;
    }
  }

  async extractIntent(userInput: string): Promise<{
    intent: string;
    entities: Record<string, any>;
    confidence: number;
    sql?: string;
  }> {
    try {
      const systemPrompt = `You are a flight operations assistant that converts natural language queries into structured data for database queries.

Given a user's question about United Airlines flights, extract:
1. The intent (e.g., flight_status, gate_info, departure_time, arrival_time, delay_status, flight_search)
2. Relevant entities (e.g., flight_number, origin, destination, date)
3. A confidence score (0-1)
4. The appropriate SQL query for the database

The database has the following main tables:
- flights: flight_number, origin, destination, scheduled_departure, scheduled_arrival, actual_departure, actual_arrival, status, gate, terminal
- delays: flight_number, delay_minutes, delay_reason
- aircraft: flight_number, aircraft_type, tail_number

Respond in JSON format:
{
  "intent": "intent_name",
  "entities": { "key": "value" },
  "confidence": 0.95,
  "sql": "SELECT ... FROM ..."
}`;

      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userInput },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{}');
      return result;
    } catch (error) {
      console.error('Intent extraction error:', error);
      throw error;
    }
  }

  async generateResponse(
    queryResult: any[],
    userQuery: string,
    intent: any
  ): Promise<string> {
    try {
      const systemPrompt = `You are a helpful flight operations assistant. 
Given the database query results and the user's original question, provide a clear, concise, and natural response.
Be specific with flight numbers, times, gates, and other details.
If no results were found, politely inform the user.`;

      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `User asked: "${userQuery}"
Intent detected: ${intent.intent}
Entities: ${JSON.stringify(intent.entities)}
Query results: ${JSON.stringify(queryResult)}

Please provide a natural, helpful response.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
      });

      return (
        response.choices[0]?.message?.content ||
        "I apologize, but I couldn't generate a response."
      );
    } catch (error) {
      console.error('Response generation error:', error);
      throw error;
    }
  }

  async textToSpeech(text: string): Promise<Readable> {
    try {
      const response = await this.client.audio.speech.create({
        model: 'tts-1',
        voice: 'nova',
        input: text,
        response_format: 'mp3',
      });

      const buffer = Buffer.from(await response.arrayBuffer());
      const stream = Readable.from(buffer);
      return stream;
    } catch (error) {
      console.error('TTS error:', error);
      throw error;
    }
  }
}
