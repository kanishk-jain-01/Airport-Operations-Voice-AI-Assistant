# Flight Operations Assistant

A voice-enabled flight operations assistant that allows querying United Airlines flight information using natural language.

## Features

- **Wake Word Detection**: Hands-free activation using Picovoice Porcupine (supports "Jarvis", "Alexa", "Hey Google")
- **Speech-to-Text**: Real-time audio transcription using OpenAI Whisper
- **Natural Language Processing**: Intent extraction and entity recognition using GPT-4o-mini
- **Database Queries**: In-memory SQLite database for fast flight information retrieval
- **Text-to-Speech**: Natural voice responses using OpenAI TTS
- **Real-time Streaming**: WebSocket-based audio streaming for low latency

## Architecture

### Frontend (React + TypeScript + Vite)
- Wake word detection (Picovoice Porcupine)
- Audio capture and streaming via WebSocket
- Modern UI with Tailwind CSS
- Real-time status updates and debugging information

### Backend (Node.js + TypeScript)
- WebSocket server for audio streaming
- OpenAI Whisper API for speech-to-text
- GPT-4o-mini for intent extraction and NLP
- SQLite database (in-memory) for flight queries
- OpenAI TTS for voice responses

## Setup

### Prerequisites
- Node.js 18+
- OpenAI API key
- Picovoice access key (optional, for wake word detection)
- SQLite database file: `united_airlines_normalized (Gauntlet).db`

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```bash
OPENAI_API_KEY=your_openai_api_key_here
PORT=3001
```

4. Place your SQLite database file in the backend directory

5. Start the backend server:
```bash
npm run dev
```

The backend will run on:
- HTTP API: http://localhost:3001
- WebSocket: ws://localhost:8080

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. (Optional) Create a `.env` file for wake word detection:
```bash
VITE_PICOVOICE_ACCESS_KEY=your_picovoice_access_key_here
```

4. Start the development server:
```bash
npm run dev
```

The frontend will run on http://localhost:5173

## Usage

### Voice Input
1. Click the microphone button to start recording
2. Speak your query (e.g., "What is the status of flight UA2406?")
3. Click the microphone button again to stop and process

### Wake Word (Optional)
1. Enable wake word detection in the UI
2. Say "Jarvis", "Alexa", or "Hey Google" to activate
3. The assistant will automatically start listening

### Text Input
Type your query in the text input field and press Send

## Example Queries

- "What is the status of flight UA2406?"
- "What gate is UA123 departing from?"
- "Show me all flights from SFO to LAX"
- "Is flight UA456 delayed?"
- "What time does UA789 arrive?"

## API Endpoints

### Backend API

- `GET /health` - Health check
- `GET /api/tables` - List database tables
- `POST /api/query` - Execute SQL query

### WebSocket Messages

#### Client to Server:
- `start_recording` - Begin audio recording
- `audio_chunk` - Send audio data
- `stop_recording` - End recording and process
- `text_query` - Send text query
- `ping` - Keep-alive

#### Server to Client:
- `recording_started` - Confirms recording started
- `processing_started` - Processing begun
- `transcription` - STT result
- `intent` - NLP analysis result
- `response` - Natural language response
- `audio_response` - TTS audio data
- `processing_complete` - Processing finished
- `error` - Error message

## Development

### Backend Development
```bash
cd backend
npm run dev  # Start with hot reload
npm run build  # Build for production
npm start  # Run production build
```

### Frontend Development
```bash
cd frontend
npm run dev  # Start development server
npm run build  # Build for production
npm run preview  # Preview production build
```

## Performance Optimization

- SQLite database loaded entirely in memory for sub-100ms queries
- WebSocket streaming for low-latency audio transmission
- Chunked audio processing for real-time transcription
- Parallel processing of STT and NLP when possible

## Error Handling

- Automatic WebSocket reconnection with exponential backoff
- Graceful degradation when wake word detection unavailable
- Clear error messages in UI for debugging
- Fallback responses for low-confidence intents

## License

MIT