/**
 * Main Application Logic for RealiBuddy
 * Handles state management, UI updates, and coordination between modules
 */

// Application state
const appState = {
    isMonitoring: false,
    emergencyStopActive: false,
    zapCount: 0,
    claimsChecked: 0,
    trueClaims: 0,
    falseClaims: 0,
    lastZapTime: null,
    sessionStartTime: null,
    cooldownEndTime: null,
    baseIntensity: 30,
    transcript: [],
    factChecks: [],
    wordCount: 0
};

// DOM elements
const elements = {
    // Status indicators
    micIndicator: document.getElementById('mic-indicator'),
    micStatus: document.getElementById('mic-status'),
    wsIndicator: document.getElementById('ws-indicator'),
    wsStatus: document.getElementById('ws-status'),
    deepgramIndicator: document.getElementById('deepgram-indicator'),
    deepgramStatus: document.getElementById('deepgram-status'),
    geminiIndicator: document.getElementById('gemini-indicator'),
    geminiStatus: document.getElementById('gemini-status'),

    // Control buttons
    toggleMonitoringBtn: document.getElementById('toggle-monitoring-btn'),
    emergencyStopBtn: document.getElementById('emergency-stop-btn'),
    clearTranscriptBtn: document.getElementById('clear-transcript-btn'),
    clearFactsBtn: document.getElementById('clear-facts-btn'),
    submitTextBtn: document.getElementById('submit-text-btn'),
    textInput: document.getElementById('text-input'),

    // Statistics
    zapCount: document.getElementById('zap-count'),
    cooldownTimer: document.getElementById('cooldown-timer'),
    cooldownBar: document.getElementById('cooldown-bar'),
    lastZapTime: document.getElementById('last-zap-time'),
    lastZapReason: document.getElementById('last-zap-reason'),
    claimsChecked: document.getElementById('claims-checked'),
    accuracyPercentage: document.getElementById('accuracy-percentage'),
    accuracyBar: document.getElementById('accuracy-bar'),
    wordCount: document.getElementById('word-count'),
    sessionDuration: document.getElementById('session-duration'),

    // Content areas
    transcriptContainer: document.getElementById('transcript-container'),
    factChecksContainer: document.getElementById('fact-checks-container'),

    // Settings
    baseIntensitySlider: document.getElementById('base-intensity-slider'),
    baseIntensityValue: document.getElementById('base-intensity-value'),
    websocketUrl: document.getElementById('websocket-url'),
    autoReconnect: document.getElementById('auto-reconnect'),

    // Toasts
    errorToast: document.getElementById('error-toast'),
    errorMessage: document.getElementById('error-message'),
    successToast: document.getElementById('success-toast'),
    successMessage: document.getElementById('success-message')
};

/**
 * Initialize application
 */
async function initialize() {
    console.log('Initializing RealiBuddy...');

    // Set up event listeners
    setupEventListeners();

    // Set up WebSocket handlers
    setupWebSocketHandlers();

    // Set up audio status handler
    setupAudioHandlers();

    // Load settings from localStorage
    loadSettings();

    // Start UI update loops
    startUIUpdates();

    // Auto-connect to WebSocket server
    autoConnect();

    console.log('RealiBuddy initialized');
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    // Toggle monitoring button
    elements.toggleMonitoringBtn.addEventListener('click', handleToggleMonitoring);

    // Emergency stop button
    elements.emergencyStopBtn.addEventListener('click', handleEmergencyStop);

    // Text input submit button
    elements.submitTextBtn.addEventListener('click', handleTextInputSubmit);

    // Allow Enter key to submit text (Ctrl+Enter for newline)
    elements.textInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
            e.preventDefault();
            handleTextInputSubmit();
        }
    });

    // Clear buttons
    elements.clearTranscriptBtn.addEventListener('click', clearTranscript);
    elements.clearFactsBtn.addEventListener('click', clearFactChecks);

    // Settings
    elements.baseIntensitySlider.addEventListener('input', (e) => {
        appState.baseIntensity = parseInt(e.target.value);
        elements.baseIntensityValue.textContent = appState.baseIntensity;
        saveSettings();
    });

    elements.autoReconnect.addEventListener('change', (e) => {
        wsClient.setAutoReconnect(e.target.checked);
        saveSettings();
    });
}

/**
 * Set up WebSocket message handlers
 */
function setupWebSocketHandlers() {
    // Connection state changes
    wsClient.onConnectionStateChange((state) => {
        updateConnectionStatus(state);
    });

    // Transcript interim results
    wsClient.on('transcript_interim', (message) => {
        displayTranscriptInterim(message.text, message.timestamp);
        updateDeepgramStatus('processing');
    });

    // Transcript final results
    wsClient.on('transcript_final', (message) => {
        displayTranscriptFinal(message.text, message.timestamp);
        updateDeepgramStatus('active');
    });

    // Fact check results
    wsClient.on('fact_check_result', (message) => {
        displayFactCheck(message);
        appState.claimsChecked++;

        if (message.verdict === 'true') {
            appState.trueClaims++;
        } else if (message.verdict === 'false') {
            appState.falseClaims++;
        }

        updateStatistics();
        updateGeminiStatus('idle');
    });

    // Fact check started
    wsClient.on('fact_check_started', (message) => {
        updateGeminiStatus('processing');
    });

    // Zap delivered
    wsClient.on('zap_delivered', (message) => {
        handleZapDelivered(message);
    });

    // Safety status updates
    wsClient.on('safety_status', (message) => {
        updateSafetyStatus(message);
    });

    // Error messages
    wsClient.on('error', (message) => {
        showError(message.message);
    });

    // Success messages
    wsClient.on('success', (message) => {
        showSuccess(message.message);
    });
}

/**
 * Set up audio status handlers
 */
function setupAudioHandlers() {
    audioCapture.onStatusChange((status) => {
        updateMicrophoneStatus(status);
    });
}

/**
 * Handle toggle monitoring button
 */
async function handleToggleMonitoring() {
    if (appState.emergencyStopActive) {
        showError('Emergency stop is active. Refresh page to reset.');
        return;
    }

    if (!appState.isMonitoring) {
        // Start monitoring
        try {
            elements.toggleMonitoringBtn.disabled = true;

            // Initialize audio if not already done
            if (!audioCapture.getAudioContextState()) {
                await audioCapture.initialize();
            }

            // Connect to WebSocket
            const wsUrl = elements.websocketUrl.value;
            wsClient.connect(wsUrl);

            // Wait for connection
            await waitForConnection();

            // Start audio capture
            await audioCapture.startCapture((audioData) => {
                wsClient.sendAudio(audioData);
            });

            // Send start monitoring message
            wsClient.send({ type: 'start_monitoring' });

            // Update state
            appState.isMonitoring = true;
            appState.sessionStartTime = Date.now();

            // Update UI
            elements.toggleMonitoringBtn.textContent = 'Stop Monitoring';
            elements.toggleMonitoringBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
            elements.toggleMonitoringBtn.classList.add('bg-red-600', 'hover:bg-red-700', 'monitoring');

            showSuccess('Monitoring started');
        } catch (error) {
            console.error('Error starting monitoring:', error);
            showError(`Failed to start: ${error.message}`);
        } finally {
            elements.toggleMonitoringBtn.disabled = false;
        }
    } else {
        // Stop monitoring
        stopMonitoring();
    }
}

/**
 * Stop monitoring
 */
function stopMonitoring() {
    // Stop audio capture
    audioCapture.stopCapture();

    // Send stop monitoring message
    if (wsClient.isConnected()) {
        wsClient.send({ type: 'stop_monitoring' });
    }

    // Update state
    appState.isMonitoring = false;

    // Update UI
    elements.toggleMonitoringBtn.textContent = 'Start Monitoring';
    elements.toggleMonitoringBtn.classList.remove('bg-red-600', 'hover:bg-red-700', 'monitoring');
    elements.toggleMonitoringBtn.classList.add('bg-green-600', 'hover:bg-green-700');

    showSuccess('Monitoring stopped');
}

/**
 * Handle emergency stop
 */
function handleEmergencyStop() {
    if (appState.emergencyStopActive) {
        return;
    }

    // Stop monitoring immediately
    if (appState.isMonitoring) {
        stopMonitoring();
    }

    // Send emergency stop message
    if (wsClient.isConnected()) {
        wsClient.send({ type: 'emergency_stop' });
    }

    // Update state
    appState.emergencyStopActive = true;

    // Update UI
    elements.emergencyStopBtn.textContent = 'EMERGENCY STOP ACTIVE';
    elements.emergencyStopBtn.classList.add('activated');
    elements.emergencyStopBtn.disabled = true;
    elements.toggleMonitoringBtn.disabled = true;

    showError('EMERGENCY STOP ACTIVATED - All zaps disabled. Refresh page to reset.');
}

/**
 * Auto-connect to WebSocket server on page load
 */
async function autoConnect() {
    if (wsClient.isConnected()) {
        console.log('Already connected');
        return;
    }

    try {
        console.log('Auto-connecting to WebSocket server...');

        // Get WebSocket URL from settings
        const wsUrl = elements.websocketUrl.value || 'ws://localhost:3001';

        // Connect to WebSocket
        wsClient.connect(wsUrl);

        // Wait for connection with timeout
        await waitForConnection();

        console.log('Auto-connected successfully');
        showSuccess('Connected to server');

    } catch (error) {
        console.error('Auto-connection failed:', error);
        console.log('You can try refreshing the page or check if backend is running');
        // Don't show error toast on auto-connect failure - just log it
    }
}

/**
 * Handle text input submission for fact-checking
 */
async function handleTextInputSubmit() {
    const text = elements.textInput.value.trim();

    // Validation
    if (!text) {
        showError('Please enter a statement to fact-check');
        return;
    }

    if (!wsClient.isConnected()) {
        showError('Not connected to server. Please wait for connection.');
        return;
    }

    if (appState.emergencyStopActive) {
        showError('Emergency stop is active. Refresh page to reset.');
        return;
    }

    try {
        // Disable button during processing
        elements.submitTextBtn.disabled = true;
        elements.submitTextBtn.textContent = 'Checking...';

        // Trigger fact-checking
        const timestamp = Date.now();

        // Show fact-check started
        showSuccess('Fact-checking statement...');

        // Send text input message to backend for fact-checking
        wsClient.send({
            type: 'text_input',
            text: text,
            timestamp: timestamp,
            baseIntensity: appState.baseIntensity
        });

        // Clear input
        elements.textInput.value = '';

    } catch (error) {
        console.error('Error submitting text:', error);
        showError(`Failed to submit: ${error.message}`);
    } finally {
        // Re-enable button
        elements.submitTextBtn.disabled = false;
        elements.submitTextBtn.textContent = 'Check This Statement';
    }
}

/**
 * Wait for WebSocket connection
 */
function waitForConnection() {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Connection timeout'));
        }, 5000);

        const checkConnection = () => {
            if (wsClient.isConnected()) {
                clearTimeout(timeout);
                resolve();
            } else if (wsClient.getState() === 'error') {
                clearTimeout(timeout);
                reject(new Error('Connection failed'));
            } else {
                setTimeout(checkConnection, 100);
            }
        };

        checkConnection();
    });
}

/**
 * Update connection status display
 */
function updateConnectionStatus(state) {
    const statusMap = {
        'connecting': { text: 'Connecting...', class: 'status-connecting' },
        'connected': { text: 'Connected', class: 'status-connected' },
        'disconnected': { text: 'Disconnected', class: 'status-idle' },
        'error': { text: 'Error', class: 'status-error' }
    };

    const status = statusMap[state] || statusMap['disconnected'];

    elements.wsStatus.textContent = status.text;
    elements.wsIndicator.className = `w-3 h-3 rounded-full ${status.class}`;
}

/**
 * Update microphone status display
 */
function updateMicrophoneStatus(status) {
    const statusMap = {
        'requesting': { text: 'Requesting...', class: 'status-connecting' },
        'granted': { text: 'Ready', class: 'status-idle' },
        'capturing': { text: 'Capturing', class: 'status-connected' },
        'stopped': { text: 'Stopped', class: 'status-idle' },
        'denied': { text: 'Access Denied', class: 'status-error' },
        'error': { text: 'Error', class: 'status-error' }
    };

    const statusInfo = statusMap[status] || { text: 'Not Connected', class: 'status-idle' };

    elements.micStatus.textContent = statusInfo.text;
    elements.micIndicator.className = `w-3 h-3 rounded-full ${statusInfo.class}`;
}

/**
 * Update Deepgram status display
 */
function updateDeepgramStatus(status) {
    const statusMap = {
        'idle': { text: 'Idle', class: 'status-idle' },
        'active': { text: 'Listening', class: 'status-connected' },
        'processing': { text: 'Processing', class: 'status-connecting' }
    };

    const statusInfo = statusMap[status] || statusMap['idle'];

    elements.deepgramStatus.textContent = statusInfo.text;
    elements.deepgramIndicator.className = `w-3 h-3 rounded-full ${statusInfo.class}`;
}

/**
 * Update Gemini status display
 */
function updateGeminiStatus(status) {
    const statusMap = {
        'idle': { text: 'Idle', class: 'status-idle' },
        'processing': { text: 'Fact Checking', class: 'status-connecting' }
    };

    const statusInfo = statusMap[status] || statusMap['idle'];

    elements.geminiStatus.textContent = statusInfo.text;
    elements.geminiIndicator.className = `w-3 h-3 rounded-full ${statusInfo.class}`;
}

/**
 * Display interim transcript
 */
function displayTranscriptInterim(text, timestamp) {
    // Remove any existing interim line
    const existingInterim = elements.transcriptContainer.querySelector('.transcript-interim');
    if (existingInterim) {
        existingInterim.remove();
    }

    // Add new interim line
    const line = document.createElement('div');
    line.className = 'transcript-line transcript-interim';

    const time = new Date(timestamp).toLocaleTimeString();
    line.innerHTML = `<span class="transcript-timestamp">${time}</span>${text}`;

    elements.transcriptContainer.appendChild(line);
    elements.transcriptContainer.scrollTop = elements.transcriptContainer.scrollHeight;
}

/**
 * Display final transcript
 */
function displayTranscriptFinal(text, timestamp) {
    // Remove interim line
    const existingInterim = elements.transcriptContainer.querySelector('.transcript-interim');
    if (existingInterim) {
        existingInterim.remove();
    }

    // Clear placeholder if present
    if (elements.transcriptContainer.children.length === 1 &&
        elements.transcriptContainer.querySelector('.text-gray-500')) {
        elements.transcriptContainer.innerHTML = '';
    }

    // Add final line
    const line = document.createElement('div');
    line.className = 'transcript-line transcript-final';

    const time = new Date(timestamp).toLocaleTimeString();
    line.innerHTML = `<span class="transcript-timestamp">${time}</span>${text}`;

    elements.transcriptContainer.appendChild(line);
    elements.transcriptContainer.scrollTop = elements.transcriptContainer.scrollHeight;

    // Update transcript state and word count
    appState.transcript.push({ text, timestamp });
    appState.wordCount += text.split(/\s+/).length;
    elements.wordCount.textContent = appState.wordCount;
}

/**
 * Display fact check result
 */
function displayFactCheck(data) {
    // Clear placeholder if present
    if (elements.factChecksContainer.children.length === 1 &&
        elements.factChecksContainer.querySelector('.text-gray-500')) {
        elements.factChecksContainer.innerHTML = '';
    }

    // Create fact check card
    const card = document.createElement('div');
    card.className = `fact-card verdict-${data.verdict}`;

    const confidence = Math.round(data.confidence * 100);
    const confidenceClass = confidence >= 70 ? 'high' : confidence >= 40 ? 'medium' : 'low';

    const time = new Date().toLocaleTimeString();

    card.innerHTML = `
        <div class="fact-claim">${escapeHtml(data.claim)}</div>
        <div class="flex items-center justify-between mb-2">
            <span class="fact-verdict verdict-${data.verdict}">${data.verdict.toUpperCase()}</span>
            <span class="fact-confidence">${confidence}% confident</span>
        </div>
        <div class="confidence-bar">
            <div class="confidence-fill ${confidenceClass}" style="width: ${confidence}%"></div>
        </div>
        ${data.evidence ? `<div class="fact-evidence">${escapeHtml(data.evidence)}</div>` : ''}
        <div class="fact-timestamp">${time}</div>
    `;

    // Add to top of container
    elements.factChecksContainer.insertBefore(card, elements.factChecksContainer.firstChild);

    // Add to state
    appState.factChecks.push(data);
}

/**
 * Handle zap delivered
 */
function handleZapDelivered(data) {
    appState.zapCount++;
    appState.lastZapTime = Date.now();
    appState.cooldownEndTime = Date.now() + 5000; // 5 second cooldown

    // Update UI
    elements.zapCount.textContent = appState.zapCount;
    elements.lastZapTime.textContent = new Date().toLocaleTimeString();
    elements.lastZapReason.textContent = data.reason || 'Lie detected';

    // Flash effect
    document.body.classList.add('zap-flash');
    setTimeout(() => {
        document.body.classList.remove('zap-flash');
    }, 1500);

    showSuccess(`Zap delivered (intensity: ${data.intensity})`);
}

/**
 * Update safety status
 */
function updateSafetyStatus(data) {
    if (data.zapCount !== undefined) {
        appState.zapCount = data.zapCount;
        elements.zapCount.textContent = appState.zapCount;
    }
}

/**
 * Update statistics display
 */
function updateStatistics() {
    elements.claimsChecked.textContent = appState.claimsChecked;

    if (appState.claimsChecked > 0) {
        const truthRate = Math.round((appState.trueClaims / appState.claimsChecked) * 100);
        elements.accuracyPercentage.textContent = `${truthRate}%`;
        elements.accuracyBar.style.width = `${truthRate}%`;
    }
}

/**
 * Clear transcript
 */
function clearTranscript() {
    elements.transcriptContainer.innerHTML = '<div class="text-gray-500 italic">Transcript will appear here...</div>';
    appState.transcript = [];
    appState.wordCount = 0;
    elements.wordCount.textContent = '0';
}

/**
 * Clear fact checks
 */
function clearFactChecks() {
    elements.factChecksContainer.innerHTML = '<div class="text-gray-500 italic text-sm">Fact-check results will appear here...</div>';
    appState.factChecks = [];
}

/**
 * Show error toast
 */
function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorToast.classList.remove('hidden');
    elements.errorToast.classList.add('toast-show');

    setTimeout(() => {
        elements.errorToast.classList.add('toast-hide');
        setTimeout(() => {
            elements.errorToast.classList.remove('toast-show', 'toast-hide');
            elements.errorToast.classList.add('hidden');
        }, 300);
    }, 5000);
}

/**
 * Show success toast
 */
function showSuccess(message) {
    elements.successMessage.textContent = message;
    elements.successToast.classList.remove('hidden');
    elements.successToast.classList.add('toast-show');

    setTimeout(() => {
        elements.successToast.classList.add('toast-hide');
        setTimeout(() => {
            elements.successToast.classList.remove('toast-show', 'toast-hide');
            elements.successToast.classList.add('hidden');
        }, 300);
    }, 3000);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Start UI update loops
 */
function startUIUpdates() {
    // Update cooldown timer every 100ms
    setInterval(updateCooldownDisplay, 100);

    // Update session duration every second
    setInterval(updateSessionDuration, 1000);
}

/**
 * Update cooldown display
 */
function updateCooldownDisplay() {
    if (!appState.cooldownEndTime || Date.now() >= appState.cooldownEndTime) {
        elements.cooldownTimer.textContent = 'Ready';
        elements.cooldownBar.style.width = '100%';
        return;
    }

    const remaining = appState.cooldownEndTime - Date.now();
    const seconds = (remaining / 1000).toFixed(1);
    elements.cooldownTimer.textContent = `${seconds}s`;

    const progress = (remaining / 5000) * 100;
    elements.cooldownBar.style.width = `${progress}%`;
}

/**
 * Update session duration
 */
function updateSessionDuration() {
    if (!appState.sessionStartTime) {
        elements.sessionDuration.textContent = '00:00';
        return;
    }

    const elapsed = Math.floor((Date.now() - appState.sessionStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    elements.sessionDuration.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Save settings to localStorage
 */
function saveSettings() {
    const settings = {
        baseIntensity: appState.baseIntensity,
        websocketUrl: elements.websocketUrl.value,
        autoReconnect: elements.autoReconnect.checked
    };
    localStorage.setItem('realibuddy-settings', JSON.stringify(settings));
}

/**
 * Load settings from localStorage
 */
function loadSettings() {
    const saved = localStorage.getItem('realibuddy-settings');
    if (saved) {
        try {
            const settings = JSON.parse(saved);

            if (settings.baseIntensity !== undefined) {
                appState.baseIntensity = settings.baseIntensity;
                elements.baseIntensitySlider.value = settings.baseIntensity;
                elements.baseIntensityValue.textContent = settings.baseIntensity;
            }

            if (settings.websocketUrl) {
                elements.websocketUrl.value = settings.websocketUrl;
            }

            if (settings.autoReconnect !== undefined) {
                elements.autoReconnect.checked = settings.autoReconnect;
                wsClient.setAutoReconnect(settings.autoReconnect);
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }
}

// Initialize application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}
