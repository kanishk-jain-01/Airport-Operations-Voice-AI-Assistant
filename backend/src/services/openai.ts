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
1. The intent (e.g., flight_status, gate_info, departure_time, arrival_time, flight_search, crew_info, boarding_info)
2. Relevant entities (e.g., flight_number, origin, destination, date, time)
3. A confidence score (0-1)
4. The appropriate SQL query for the database

The database schema is:

FLIGHTS table (main flight information):
- flight_id (VARCHAR, primary key)
- airline_code (VARCHAR)
- flight_number (VARCHAR) - format like "UA1214"
- origin_airport_code (VARCHAR) - format like "XLOS", "XPHO" 
- destination_airport_code (VARCHAR) - format like "XPHO", "XSAN"
- scheduled_arrival (TIMESTAMP)
- actual_arrival (TIMESTAMP) 
- scheduled_departure (TIMESTAMP)
- actual_departure (TIMESTAMP)
- flight_status (VARCHAR) - values like "On Time Depature", "Late", "Turning", "Turning Preparation", "Waiting on Aircraft"
- gate_id (INTEGER, foreign key to gates table)
- aircraft_type (VARCHAR)
- passenger_count (INTEGER)
- captain_name (VARCHAR)
- cabin_lead_name (VARCHAR)
- ramp_manager_name (VARCHAR)
- connecting_bags_info (VARCHAR)

AIRPORTS table (airport information):
- airport_code (VARCHAR, primary key) - format like "XDAL", "XMIA"
- airport_name (VARCHAR) - like "Dallas (DFW) Regional Airport"
- city_name (VARCHAR) - like "Dallas (DFW)"
- state_code (VARCHAR)
- country_code (VARCHAR)

GATES table (gate information):
- gate_id (INTEGER, primary key)
- gate_number (VARCHAR) - like "C6", "B20"
- terminal (VARCHAR) - like "C", "B"
- gate_type (VARCHAR) - like "Standard"
- is_active (BOOLEAN)

FLIGHT_OPERATIONS table (operational details):
- operation_id (INTEGER, primary key)
- flight_id (VARCHAR, foreign key)
- boarding_start_time (TIMESTAMP)
- pushback_target_time (TIMESTAMP)
- external_power_info (VARCHAR)
- ramp_team_members (TEXT)

EMPLOYEES table (staff information):
- employee_id (VARCHAR, primary key)
- employee_name (VARCHAR)
- phone_number (VARCHAR)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

Query Guidelines:
- Use JOINs to get airport names: JOIN airports ON flights.origin_airport_code = airports.airport_code
- Use JOINs to get gate info: JOIN gates ON flights.gate_id = gates.gate_id
- Flight numbers should be matched with LIKE '%flight_number%' or exact match
- Airport codes in this system use X prefix (XLOS, XPHO, etc.)
- For city searches, JOIN with airports table and search city_name
- Flight status values include "On Time Depature", "Late", "Turning", "Turning Preparation", "Waiting on Aircraft"

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
      const systemPrompt = `You are a helpful United Airlines flight operations assistant. 
Given the database query results and the user's original question, provide a clear, concise, and natural response.

Guidelines:
- Be specific with flight numbers, times, gates, cities, and other details
- Format times in a readable way (e.g., "6:17 AM" instead of "06:17:00")
- Use city names when available (e.g., "Los Angeles" not "XLOS")
- If flight status is "On Time Depature", say "on time for departure"
- If flight status is "Late", mention the delay
- For flight searches, list multiple flights clearly
- If no results found, politely suggest alternatives or ask for clarification
- Keep responses conversational and professional
- Include relevant operational details like aircraft type, gate, terminal when available`;

      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `User asked: "${userQuery}"
Intent: ${intent.intent}
Entities: ${JSON.stringify(intent.entities)}
Query results: ${JSON.stringify(queryResult, null, 2)}

Please provide a natural, helpful response.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 250,
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

  async *generateResponseStream(
    queryResult: any[],
    userQuery: string,
    intent: any
  ): AsyncGenerator<string, void, unknown> {
    try {
      const systemPrompt = `You are a helpful United Airlines flight operations assistant. 
Given the database query results and the user's original question, provide a clear, concise, and natural response.

Guidelines:
- Be specific with flight numbers, times, gates, cities, and other details
- Format times in a readable way (e.g., "6:17 AM" instead of "06:17:00")
- Use city names when available (e.g., "Los Angeles" not "XLOS")
- If flight status is "On Time Depature", say "on time for departure"
- If flight status is "Late", mention the delay
- For flight searches, list multiple flights clearly
- If no results found, politely suggest alternatives or ask for clarification
- Keep responses conversational and professional
- Include relevant operational details like aircraft type, gate, terminal when available`;

      const stream = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `User asked: "${userQuery}"
Intent: ${intent.intent}
Entities: ${JSON.stringify(intent.entities)}
Query results: ${JSON.stringify(queryResult, null, 2)}

Please provide a natural, helpful response.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 250,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      console.error('Response generation streaming error:', error);
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

  async textToSpeechChunk(text: string): Promise<Buffer> {
    try {
      const response = await this.client.audio.speech.create({
        model: 'tts-1',
        voice: 'nova',
        input: text,
        response_format: 'mp3',
      });

      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      console.error('TTS chunk error:', error);
      throw error;
    }
  }
}
