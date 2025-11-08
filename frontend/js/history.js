// History and Dashboard Management
const API_BASE = 'http://localhost:3001/api/history';

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.getAttribute('data-tab');
        switchTab(tabName);
    });
});

function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });

    // Show selected tab
    const selectedTab = document.getElementById(`${tabName}-tab`);
    if (selectedTab) {
        selectedTab.classList.remove('hidden');
    }

    // Update button styles
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active', 'border-blue-500', 'text-blue-400');
        btn.classList.add('border-gray-700', 'text-gray-400');
    });

    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active', 'border-blue-500', 'text-blue-400');
    document.querySelector(`[data-tab="${tabName}"]`).classList.remove('border-gray-700', 'text-gray-400');

    // Load data for specific tabs
    if (tabName === 'dashboard') {
        loadDashboardData();
    } else if (tabName === 'history') {
        loadHistorySessions();
    }
}

// Load dashboard statistics
async function loadDashboardData() {
    try {
        const response = await fetch(`${API_BASE}/stats`);
        const stats = await response.json();

        // Update stat boxes
        document.getElementById('dash-total-zaps').textContent = stats.totalZaps;
        document.getElementById('dash-total-claims').textContent = stats.totalClaims;
        document.getElementById('dash-truth-rate').textContent = `${Math.round(stats.truthRate * 100)}%`;
        document.getElementById('dash-false-rate').textContent = `${Math.round(stats.falseRate * 100)}%`;

        // Calculate verdicts count
        const trueCount = Math.round(stats.totalClaims * stats.truthRate);
        const falseCount = Math.round(stats.totalClaims * stats.falseRate);
        const unverifiableCount = stats.totalClaims - trueCount - falseCount;

        document.getElementById('dash-true-count').textContent = trueCount;
        document.getElementById('dash-false-count').textContent = falseCount;
        document.getElementById('dash-unverif-count').textContent = unverifiableCount;

        // Update bars
        const total = stats.totalClaims || 1;
        document.getElementById('dash-true-bar').style.width = `${(trueCount / total) * 100}%`;
        document.getElementById('dash-false-bar').style.width = `${(falseCount / total) * 100}%`;
        document.getElementById('dash-unverif-bar').style.width = `${(unverifiableCount / total) * 100}%`;

        // Load recent claims
        loadRecentClaims();
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Load recent claims for dashboard
async function loadRecentClaims() {
    try {
        const response = await fetch(`${API_BASE}/sessions`);
        const sessions = await response.json();

        let recentClaims = [];

        // Collect all claims from all sessions, most recent first
        for (const session of sessions) {
            const sessionResponse = await fetch(`${API_BASE}/sessions/${session.id}`);
            const sessionData = await sessionResponse.json();

            for (const factCheck of sessionData.factChecks) {
                recentClaims.push({
                    ...factCheck,
                    sessionId: session.id,
                    sessionStartTime: session.start_time
                });
            }
        }

        // Sort by timestamp, most recent first
        recentClaims.sort((a, b) => b.timestamp - a.timestamp);

        // Take top 10
        recentClaims = recentClaims.slice(0, 10);

        // Display
        const container = document.getElementById('recent-claims-list');
        if (recentClaims.length === 0) {
            container.innerHTML = '<div class="text-gray-500 italic">No claims yet</div>';
            return;
        }

        container.innerHTML = recentClaims.map(claim => `
            <div class="bg-gray-700 rounded p-3">
                <div class="text-sm text-gray-200 truncate">${claim.transcript}</div>
                <div class="flex justify-between mt-1">
                    <span class="text-xs font-bold ${getVerdictColor(claim.verdict)}">${claim.verdict}</span>
                    <span class="text-xs text-gray-400">${Math.round(claim.confidence * 100)}%</span>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading recent claims:', error);
    }
}

// Load all sessions for history tab
async function loadHistorySessions() {
    try {
        const response = await fetch(`${API_BASE}/sessions`);
        const sessions = await response.json();

        const container = document.getElementById('sessions-list');

        if (sessions.length === 0) {
            container.innerHTML = '<div class="bg-gray-800 rounded-lg p-6 text-gray-400 text-center">No sessions recorded</div>';
            return;
        }

        container.innerHTML = sessions.map(session => {
            const startTime = new Date(session.start_time);
            const endTime = session.end_time ? new Date(session.end_time) : null;
            const duration = endTime ? Math.round((endTime - startTime) / 1000) : '—';

            return `
                <div class="bg-gray-800 rounded-lg p-6 shadow-lg">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <h3 class="text-lg font-bold">Session #${session.id}</h3>
                            <p class="text-sm text-gray-400">${startTime.toLocaleString()}</p>
                        </div>
                        <button class="text-red-400 hover:text-red-300 px-3 py-1 text-sm font-medium delete-session-btn" data-session-id="${session.id}">
                            Delete
                        </button>
                    </div>

                    <div class="grid grid-cols-4 gap-4 mb-4">
                        <div>
                            <div class="text-xs text-gray-500">Duration</div>
                            <div class="text-lg font-bold">${duration}s</div>
                        </div>
                        <div>
                            <div class="text-xs text-gray-500">Claims</div>
                            <div class="text-lg font-bold">${session.total_claims}</div>
                        </div>
                        <div>
                            <div class="text-xs text-gray-500">Zaps</div>
                            <div class="text-lg font-bold text-red-400">${session.total_zaps}</div>
                        </div>
                        <div>
                            <div class="text-xs text-gray-500">Truth Rate</div>
                            <div class="text-lg font-bold text-green-400">${Math.round(session.truth_rate * 100)}%</div>
                        </div>
                    </div>

                    <button class="text-blue-400 hover:text-blue-300 text-sm font-medium expand-session-btn" data-session-id="${session.id}">
                        View Details
                    </button>
                    <div class="session-details hidden mt-4 border-t border-gray-700 pt-4" id="details-${session.id}">
                        Loading...
                    </div>
                </div>
            `;
        }).join('');

        // Add event listeners for expand buttons
        document.querySelectorAll('.expand-session-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const sessionId = btn.getAttribute('data-session-id');
                const detailsDiv = document.getElementById(`details-${sessionId}`);
                detailsDiv.classList.toggle('hidden');

                if (!detailsDiv.classList.contains('hidden') && detailsDiv.textContent === 'Loading...') {
                    loadSessionDetails(sessionId, detailsDiv);
                }
            });
        });

        // Add event listeners for delete buttons
        document.querySelectorAll('.delete-session-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const sessionId = btn.getAttribute('data-session-id');
                if (confirm('Are you sure you want to delete this session?')) {
                    try {
                        await fetch(`${API_BASE}/sessions/${sessionId}`, { method: 'DELETE' });
                        loadHistorySessions(); // Reload list
                    } catch (error) {
                        console.error('Error deleting session:', error);
                    }
                }
            });
        });
    } catch (error) {
        console.error('Error loading sessions:', error);
        const container = document.getElementById('sessions-list');
        container.innerHTML = '<div class="bg-red-900 rounded-lg p-6 text-red-300">Error loading sessions</div>';
    }
}

// Load details for a specific session
async function loadSessionDetails(sessionId, container) {
    try {
        const response = await fetch(`${API_BASE}/sessions/${sessionId}`);
        const data = response.json();
        const sessionData = await data;

        const factChecks = sessionData.factChecks || [];

        if (factChecks.length === 0) {
            container.innerHTML = '<div class="text-gray-400 text-sm">No fact-checks in this session</div>';
            return;
        }

        container.innerHTML = `
            <div class="space-y-2">
                ${factChecks.map((fc, idx) => `
                    <div class="bg-gray-700 rounded p-3 text-sm">
                        <div class="text-gray-200 truncate">${fc.transcript}</div>
                        <div class="flex justify-between mt-1">
                            <span class="font-bold ${getVerdictColor(fc.verdict)}">${fc.verdict}</span>
                            <span class="text-gray-400">${Math.round(fc.confidence * 100)}% conf${fc.was_zapped ? ' • ZAPPED' : ''}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Error loading session details:', error);
        container.innerHTML = '<div class="text-red-400 text-sm">Error loading details</div>';
    }
}

// Export functionality
document.getElementById('export-csv-btn').addEventListener('click', () => {
    window.location.href = `${API_BASE}/export?format=csv`;
});

document.getElementById('export-json-btn').addEventListener('click', () => {
    window.location.href = `${API_BASE}/export?format=json`;
});

// Utility function to get verdict color class
function getVerdictColor(verdict) {
    switch (verdict) {
        case 'TRUE':
            return 'text-green-400';
        case 'FALSE':
            return 'text-red-400';
        case 'UNVERIFIABLE':
            return 'text-yellow-400';
        case 'MISLEADING':
            return 'text-orange-400';
        default:
            return 'text-gray-400';
    }
}
