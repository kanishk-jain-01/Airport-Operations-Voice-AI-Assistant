# Flight Operations Assistant

A voice-enabled flight operations assistant that allows querying United Airlines flight information using natural language.

## Features

- **Wake Word Detection**: Hands-free activation using Web Speech API (supports "Jarvis", "Alexa", "Hey Google", "Okay Google")
- **Speech-to-Text**: Real-time audio transcription using OpenAI Whisper
- **Natural Language Processing**: Intent extraction and entity recognition using GPT-4o-mini
- **Database Queries**: In-memory SQLite database for fast flight information retrieval
- **Text-to-Speech**: Natural voice responses using OpenAI TTS
- **Real-time Streaming**: WebSocket-based audio streaming for low latency

## Architecture

### Frontend (React + TypeScript + Vite)
- Wake word detection (Web Speech API)
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

### Quick Start

For local development:
```bash
# Clone and setup
git clone <your-repo-url>
cd frontier-audio
./scripts/setup-local.sh

# Start development
docker-compose up
# OR
cd backend && npm run dev &
cd frontend && npm run dev
```

For production deployment to AWS:
```bash
# See DEPLOYMENT.md for complete guide
./scripts/deploy.sh
```

### Prerequisites
- Node.js 20+
- OpenAI API key
- Docker (for containerized deployment)
- AWS CLI and Terraform (for cloud deployment)
- Modern web browser with Web Speech API support (for wake word detection)
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

3. Wake word detection will work automatically with supported browsers (Chrome, Safari, Edge)

4. Start the development server:
```bash
npm run dev
```

The frontend will run on http://localhost:5173

## Usage

### Voice Input
1. Click the microphone button to start recording
2. Speak your query (e.g., "What is the status of flight UA1214?")
3. Click the microphone button again to stop and process

### Wake Word (Optional)
1. Wake word detection starts automatically if supported by your browser
2. Say "Jarvis", "Alexa", "Hey Google", or "Okay Google" to activate
3. The assistant will automatically start listening
4. Ensure microphone permissions are granted for your browser

## Example Queries

Based on the actual United Airlines database:

- "What is the status of flight UA1214?"
- "What gate is UA1214 departing from?"
- "Show me all flights from Los Angeles to Phoenix"
- "Is flight UA1179 delayed?"
- "What time does UA2953 depart?"
- "Show me flights from Los Angeles"
- "What's the status of flights to San Francisco?"
- "Which flights are currently turning?"
- "What aircraft type is UA1214?"
- "Who is the captain of flight UA1357?"

## API Endpoints

### Backend API

- `GET /health` - Health check
- `GET /api/tables` - List database tables
- `POST /api/query` - Execute SQL query
- `GET /api/flight/:flightNumber` - Get flight details by flight number
- `GET /api/flights/route?origin=LAX&destination=PHX` - Search flights by route

### WebSocket Messages

#### Client to Server:
- `start_recording` - Begin audio recording
- `audio_chunk` - Send audio data
- `stop_recording` - End recording and process
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

## Deployment

This application supports both local development and cloud deployment to AWS.

### Local Development
- Docker Compose for easy local setup
- Hot reload for both frontend and backend
- Comprehensive setup script included

### Production Deployment to AWS
- **Infrastructure**: ECS Fargate with Application Load Balancer
- **Container Registry**: Amazon ECR for Docker images  
- **Monitoring**: CloudWatch for logs and metrics
- **Scaling**: Auto-scaling based on CPU and memory
- **Security**: VPC with private subnets, IAM roles, encrypted secrets
- **CI/CD**: GitHub Actions for automated deployments

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment guide including:
- AWS infrastructure setup with Terraform
- Docker containerization
- GitHub Actions CI/CD pipeline
- Monitoring and maintenance

### Branch Strategy
- `dev` branch: Development work, triggers CI pipeline
- `main` branch: Production releases, triggers CI/CD with deployment

## Error Handling

- Automatic WebSocket reconnection with exponential backoff
- Graceful degradation when Web Speech API unavailable
- Clear error messages in UI for debugging
- Fallback responses for low-confidence intents

## License

MIT