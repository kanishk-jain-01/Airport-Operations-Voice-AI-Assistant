import { WebSocketServer, WebSocket } from 'ws';
import { AudioProcessor } from '../services/audioProcessor';

export class WSServer {
  private wss: WebSocketServer;
  private audioProcessor: AudioProcessor;
  private clients: Map<
    WebSocket,
    {
      id: string;
      audioChunks: Buffer[];
      isRecording: boolean;
    }
  > = new Map();

  constructor(port: number, openaiApiKey: string) {
    this.wss = new WebSocketServer({ port });
    this.audioProcessor = new AudioProcessor(openaiApiKey);
    this.setupWebSocketServer();
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      const clientId = Math.random().toString(36).substring(7);
      console.log(`Client connected: ${clientId}`);

      this.clients.set(ws, {
        id: clientId,
        audioChunks: [],
        isRecording: false,
      });

      ws.on('message', async (data: Buffer) => {
        const client = this.clients.get(ws);
        if (!client) return;

        try {
          const message = JSON.parse(data.toString());

          switch (message.type) {
            case 'start_recording':
              client.isRecording = true;
              client.audioChunks = [];
              ws.send(JSON.stringify({ type: 'recording_started' }));
              break;

            case 'audio_chunk':
              if (client.isRecording && message.audio) {
                const audioBuffer = Buffer.from(message.audio, 'base64');
                client.audioChunks.push(audioBuffer);
              }
              break;

            case 'stop_recording':
              client.isRecording = false;

              if (client.audioChunks.length > 0) {
                ws.send(JSON.stringify({ type: 'processing_started' }));

                const audioBuffer = Buffer.concat(client.audioChunks);
                client.audioChunks = [];

                this.audioProcessor.clearAudioChunks();
                this.audioProcessor.addAudioChunk(audioBuffer);

                try {
                  for await (const chunk of this.audioProcessor.processAudioPipelineStream()) {
                    switch (chunk.type) {
                      case 'transcription':
                        ws.send(
                          JSON.stringify({
                            type: 'transcription',
                            data: chunk.data,
                          })
                        );
                        break;

                      case 'intent':
                        ws.send(
                          JSON.stringify({
                            type: 'intent',
                            data: chunk.data,
                          })
                        );
                        break;

                      case 'query_result':
                        ws.send(
                          JSON.stringify({
                            type: 'query_result',
                            data: chunk.data,
                          })
                        );
                        break;

                      case 'response_chunk':
                        ws.send(
                          JSON.stringify({
                            type: 'response_chunk',
                            data: chunk.data,
                          })
                        );
                        break;

                      case 'response_complete':
                        ws.send(
                          JSON.stringify({
                            type: 'response',
                            data: chunk.data,
                          })
                        );
                        break;

                      case 'audio_chunk':
                        if (chunk.data) {
                          ws.send(
                            JSON.stringify({
                              type: 'audio_chunk_response',
                              audio: chunk.data.toString('base64'),
                            })
                          );
                        }
                        break;

                      case 'audio_stream':
                        if (chunk.data) {
                          const audioChunks: Buffer[] = [];
                          chunk.data.on('data', (audioChunk: Buffer) => {
                            audioChunks.push(audioChunk);
                          });

                          chunk.data.on('end', () => {
                            const audioBuffer = Buffer.concat(audioChunks);
                            ws.send(
                              JSON.stringify({
                                type: 'audio_response',
                                audio: audioBuffer.toString('base64'),
                              })
                            );
                          });
                        }
                        break;
                    }
                  }

                  ws.send(JSON.stringify({ type: 'processing_complete' }));
                } catch (error) {
                  console.error('Processing error:', error);
                  ws.send(
                    JSON.stringify({
                      type: 'error',
                      message: 'Failed to process audio',
                    })
                  );
                }
              }
              break;


            case 'ping':
              ws.send(JSON.stringify({ type: 'pong' }));
              break;
          }
        } catch (error) {
          console.error('Message handling error:', error);
        }
      });

      ws.on('close', () => {
        console.log(`Client disconnected: ${this.clients.get(ws)?.id}`);
        this.clients.delete(ws);
      });

      ws.on('error', error => {
        console.error(
          `WebSocket error for client ${this.clients.get(ws)?.id}:`,
          error
        );
      });
    });

    console.log(`WebSocket server listening on port ${this.wss.options.port}`);
  }

  close(): void {
    this.wss.close();
  }
}
