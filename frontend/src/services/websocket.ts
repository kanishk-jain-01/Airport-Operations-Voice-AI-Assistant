export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  constructor(url: string) {
    this.url = url;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Clear any existing connection
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }

      try {
        this.ws = new WebSocket(this.url);
        let resolved = false;

        const connectionTimeout = setTimeout(() => {
          if (!resolved) {
            console.error('WebSocket connection timeout');
            if (this.ws) {
              this.ws.close();
              this.ws = null;
            }
            resolved = true;
            reject(new Error('Connection timeout'));
          }
        }, 5000); // 5 second timeout

        this.ws.onopen = () => {
          if (!resolved) {
            console.log('WebSocket connected');
            clearTimeout(connectionTimeout);
            this.reconnectAttempts = 0;
            resolved = true;
            resolve();
          }
        };

        this.ws.onmessage = event => {
          try {
            const message = JSON.parse(event.data);
            this.emit(message.type, message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onerror = error => {
          console.error('WebSocket error:', error);
          if (!resolved) {
            clearTimeout(connectionTimeout);
            resolved = true;
            reject(error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected', event.code, event.reason);
          clearTimeout(connectionTimeout);
          
          // Only attempt reconnect if this wasn't a deliberate close
          if (event.code !== 1000) {
            this.attemptReconnect();
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`
      );

      setTimeout(() => {
        this.connect().catch(console.error);
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(type: string, data?: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, ...data }));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  on(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (data: any) => void): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  private emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  async reconnect(): Promise<void> {
    this.disconnect();
    this.reconnectAttempts = 0;
    return this.connect();
  }

  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
