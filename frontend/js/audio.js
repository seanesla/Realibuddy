/**
 * Audio Capture Module for RealiBuddy
 * Handles microphone access, audio encoding, and streaming
 */

class AudioCapture {
    constructor() {
        this.audioContext = null;
        this.mediaStream = null;
        this.source = null;
        this.processor = null;
        this.isCapturing = false;
        this.statusCallback = null;

        // Audio configuration matching Deepgram requirements
        this.config = {
            sampleRate: 16000,      // 16kHz for Deepgram
            channelCount: 1,        // Mono
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
        };
    }

    /**
     * Request microphone permission and initialize audio context
     */
    async initialize() {
        try {
            // Check if browser supports required APIs
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Browser does not support microphone access');
            }

            this.updateStatus('requesting');

            // Request microphone access
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: this.config.echoCancellation,
                    noiseSuppression: this.config.noiseSuppression,
                    autoGainControl: this.config.autoGainControl,
                    channelCount: this.config.channelCount,
                    sampleRate: { ideal: this.config.sampleRate }
                }
            });

            console.log('Microphone access granted');
            this.updateStatus('granted');

            // Create audio context with desired sample rate
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: this.config.sampleRate
            });

            console.log('Audio context created:', {
                sampleRate: this.audioContext.sampleRate,
                state: this.audioContext.state
            });

            return true;
        } catch (error) {
            console.error('Error initializing audio:', error);
            this.updateStatus('denied');
            throw error;
        }
    }

    /**
     * Start capturing and streaming audio
     */
    async startCapture(onAudioData) {
        if (this.isCapturing) {
            console.warn('Audio capture already started');
            return;
        }

        if (!this.audioContext || !this.mediaStream) {
            throw new Error('Audio not initialized. Call initialize() first.');
        }

        try {
            // Resume audio context if suspended
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            // Create source from media stream
            this.source = this.audioContext.createMediaStreamSource(this.mediaStream);

            // Create script processor for audio processing
            // Buffer size: 4096 samples (256ms at 16kHz)
            const bufferSize = 4096;
            this.processor = this.audioContext.createScriptProcessor(
                bufferSize,
                this.config.channelCount,
                this.config.channelCount
            );

            // Handle audio processing
            this.processor.onaudioprocess = (event) => {
                if (!this.isCapturing) return;

                const inputBuffer = event.inputBuffer;
                const inputData = inputBuffer.getChannelData(0);

                // Convert Float32Array to Int16Array (PCM 16-bit)
                const int16Data = this.convertFloat32ToInt16(inputData);

                // Send audio data to callback
                if (onAudioData && typeof onAudioData === 'function') {
                    onAudioData(int16Data.buffer);
                }
            };

            // Connect audio graph
            this.source.connect(this.processor);
            this.processor.connect(this.audioContext.destination);

            this.isCapturing = true;
            this.updateStatus('capturing');

            console.log('Audio capture started');
        } catch (error) {
            console.error('Error starting audio capture:', error);
            this.updateStatus('error');
            throw error;
        }
    }

    /**
     * Stop capturing audio
     */
    stopCapture() {
        if (!this.isCapturing) {
            console.warn('Audio capture already stopped');
            return;
        }

        try {
            // Disconnect audio graph
            if (this.processor) {
                this.processor.disconnect();
                this.processor = null;
            }

            if (this.source) {
                this.source.disconnect();
                this.source = null;
            }

            this.isCapturing = false;
            this.updateStatus('stopped');

            console.log('Audio capture stopped');
        } catch (error) {
            console.error('Error stopping audio capture:', error);
        }
    }

    /**
     * Release all audio resources
     */
    cleanup() {
        this.stopCapture();

        // Stop all tracks in media stream
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => {
                track.stop();
            });
            this.mediaStream = null;
        }

        // Close audio context
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        this.updateStatus('released');
        console.log('Audio resources released');
    }

    /**
     * Convert Float32Array to Int16Array
     * Float32 range: -1.0 to 1.0
     * Int16 range: -32768 to 32767
     */
    convertFloat32ToInt16(float32Array) {
        const int16Array = new Int16Array(float32Array.length);

        for (let i = 0; i < float32Array.length; i++) {
            // Clamp values to -1.0 to 1.0 range
            let sample = Math.max(-1.0, Math.min(1.0, float32Array[i]));

            // Convert to 16-bit integer
            // If sample is negative, multiply by 0x8000 (32768)
            // If sample is positive, multiply by 0x7FFF (32767)
            int16Array[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        }

        return int16Array;
    }

    /**
     * Get current microphone status
     */
    getStatus() {
        if (!this.audioContext) return 'uninitialized';
        if (this.isCapturing) return 'capturing';
        if (this.mediaStream) return 'ready';
        return 'initialized';
    }

    /**
     * Check if microphone is available
     */
    isAvailable() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }

    /**
     * Check if capturing
     */
    isActive() {
        return this.isCapturing;
    }

    /**
     * Get audio configuration
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * Set status callback
     */
    onStatusChange(callback) {
        this.statusCallback = callback;
    }

    /**
     * Update status and notify callback
     */
    updateStatus(status) {
        if (this.statusCallback && typeof this.statusCallback === 'function') {
            this.statusCallback(status);
        }
    }

    /**
     * Get audio context state
     */
    getAudioContextState() {
        return this.audioContext ? this.audioContext.state : null;
    }

    /**
     * Get actual sample rate
     */
    getActualSampleRate() {
        return this.audioContext ? this.audioContext.sampleRate : null;
    }
}

// Create global audio capture instance
const audioCapture = new AudioCapture();
