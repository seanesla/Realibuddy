/**
 * WebSocket Client for RealiBuddy
 * Handles bidirectional communication with backend server
 */

class WebSocketClient {
    constructor() {
        this.ws = null;
        this.url = 'ws://localhost:3001';
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000; // Start with 1 second
        this.autoReconnect = true;
        this.isConnecting = false;
        this.messageHandlers = new Map();
        this.connectionStateCallbacks = [];
    }

    /**
     * Connect to WebSocket server
     */
    connect(url = null) {
        if (url) {
            this.url = url;
        }

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('WebSocket already connected');
            return;
        }

        if (this.isConnecting) {
            console.log('Connection already in progress');
            return;
        }

        this.isConnecting = true;
        this.notifyConnectionState('connecting');

        try {
            console.log(`Connecting to WebSocket: ${this.url}`);
            this.ws = new WebSocket(this.url);

            this.ws.onopen = this.handleOpen.bind(this);
            this.ws.onmessage = this.handleMessage.bind(this);
            this.ws.onerror = this.handleError.bind(this);
            this.ws.onclose = this.handleClose.bind(this);
        } catch (error) {
            console.error('WebSocket connection error:', error);
            this.isConnecting = false;
            this.notifyConnectionState('error');
            this.scheduleReconnect();
        }
    }

    /**
     * Handle WebSocket open event
     */
    handleOpen(event) {
        console.log('WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.notifyConnectionState('connected');
    }

    /**
     * Handle incoming WebSocket messages
     */
    handleMessage(event) {
        try {
            const message = JSON.parse(event.data);
            console.log('Received message:', message);

            // Call registered handlers for this message type
            if (this.messageHandlers.has(message.type)) {
                const handlers = this.messageHandlers.get(message.type);
                handlers.forEach(handler => handler(message));
            }

            // Call wildcard handlers
            if (this.messageHandlers.has('*')) {
                const handlers = this.messageHandlers.get('*');
                handlers.forEach(handler => handler(message));
            }
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    }

    /**
     * Handle WebSocket error event
     */
    handleError(event) {
        console.error('WebSocket error:', event);
        this.notifyConnectionState('error');
    }

    /**
     * Handle WebSocket close event
     */
    handleClose(event) {
        console.log('WebSocket closed:', event.code, event.reason);
        this.isConnecting = false;
        this.notifyConnectionState('disconnected');

        if (this.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
        }
    }

    /**
     * Schedule reconnection attempt with exponential backoff
     */
    scheduleReconnect() {
        this.reconnectAttempts++;
        const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);

        console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        setTimeout(() => {
            if (this.autoReconnect) {
                this.connect();
            }
        }, delay);
    }

    /**
     * Send message to server
     */
    send(message) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error('WebSocket is not connected');
            return false;
        }

        try {
            this.ws.send(JSON.stringify(message));
            return true;
        } catch (error) {
            console.error('Error sending WebSocket message:', error);
            return false;
        }
    }

    /**
     * Send binary audio data
     */
    sendAudio(audioBuffer) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error('WebSocket is not connected');
            return false;
        }

        try {
            this.ws.send(audioBuffer);
            return true;
        } catch (error) {
            console.error('Error sending audio data:', error);
            return false;
        }
    }

    /**
     * Register message handler for specific message type
     */
    on(messageType, handler) {
        if (!this.messageHandlers.has(messageType)) {
            this.messageHandlers.set(messageType, []);
        }
        this.messageHandlers.get(messageType).push(handler);
    }

    /**
     * Remove message handler
     */
    off(messageType, handler) {
        if (this.messageHandlers.has(messageType)) {
            const handlers = this.messageHandlers.get(messageType);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    /**
     * Register connection state callback
     */
    onConnectionStateChange(callback) {
        this.connectionStateCallbacks.push(callback);
    }

    /**
     * Notify all connection state callbacks
     */
    notifyConnectionState(state) {
        this.connectionStateCallbacks.forEach(callback => callback(state));
    }

    /**
     * Disconnect from WebSocket
     */
    disconnect() {
        this.autoReconnect = false;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    /**
     * Get connection state
     */
    getState() {
        if (!this.ws) return 'disconnected';

        switch (this.ws.readyState) {
            case WebSocket.CONNECTING:
                return 'connecting';
            case WebSocket.OPEN:
                return 'connected';
            case WebSocket.CLOSING:
                return 'closing';
            case WebSocket.CLOSED:
                return 'disconnected';
            default:
                return 'unknown';
        }
    }

    /**
     * Check if connected
     */
    isConnected() {
        return this.ws && this.ws.readyState === WebSocket.OPEN;
    }

    /**
     * Set auto-reconnect
     */
    setAutoReconnect(enabled) {
        this.autoReconnect = enabled;
    }

    /**
     * Reset reconnection attempts
     */
    resetReconnectAttempts() {
        this.reconnectAttempts = 0;
    }
}

// Create global WebSocket client instance
const wsClient = new WebSocketClient();
