/**
 * Advanced Canvas-based Animated Background
 * Features: Particle network, wave effects, neural network visualization
 */

class BackgroundAnimation {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.waves = [];
        this.mousePos = { x: 0, y: 0 };
        this.mouseVelocity = { x: 0, y: 0 };
        this.lastMousePos = { x: 0, y: 0 };
        this.time = 0;

        this.config = {
            particleCount: 100,
            maxDistance: 150,
            particleSpeed: 0.5,
            waveCount: 3,
            colors: {
                primary: 'rgba(59, 130, 246, ',
                secondary: 'rgba(168, 85, 247, ',
                accent: 'rgba(147, 51, 234, ',
                white: 'rgba(255, 255, 255, '
            }
        };

        this.init();
    }

    init() {
        this.resize();
        this.createParticles();
        this.createWaves();
        this.setupEventListeners();
        this.animate();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    createParticles() {
        this.particles = [];
        for (let i = 0; i < this.config.particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * this.config.particleSpeed,
                vy: (Math.random() - 0.5) * this.config.particleSpeed,
                radius: Math.random() * 2 + 1,
                opacity: Math.random() * 0.5 + 0.3,
                pulseSpeed: Math.random() * 0.02 + 0.01,
                pulsePhase: Math.random() * Math.PI * 2
            });
        }
    }

    createWaves() {
        this.waves = [];
        for (let i = 0; i < this.config.waveCount; i++) {
            this.waves.push({
                amplitude: 30 + i * 10,
                frequency: 0.01 - i * 0.002,
                speed: 0.02 + i * 0.01,
                offset: i * Math.PI / 3,
                opacity: 0.1 - i * 0.02,
                yPosition: this.canvas.height * (0.3 + i * 0.2)
            });
        }
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.resize());

        window.addEventListener('mousemove', (e) => {
            this.lastMousePos = { ...this.mousePos };
            this.mousePos = { x: e.clientX, y: e.clientY };

            // Calculate mouse velocity
            this.mouseVelocity = {
                x: this.mousePos.x - this.lastMousePos.x,
                y: this.mousePos.y - this.lastMousePos.y
            };
        });
    }

    drawParticles() {
        this.particles.forEach((particle, i) => {
            // Update position
            particle.x += particle.vx;
            particle.y += particle.vy;

            // Bounce off edges
            if (particle.x < 0 || particle.x > this.canvas.width) particle.vx *= -1;
            if (particle.y < 0 || particle.y > this.canvas.height) particle.vy *= -1;

            // Mouse interaction
            const dx = this.mousePos.x - particle.x;
            const dy = this.mousePos.y - particle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 200) {
                const force = (200 - distance) / 200;
                particle.vx -= (dx / distance) * force * 0.1;
                particle.vy -= (dy / distance) * force * 0.1;
            }

            // Velocity damping
            particle.vx *= 0.99;
            particle.vy *= 0.99;

            // Pulse effect
            const pulse = Math.sin(this.time * particle.pulseSpeed + particle.pulsePhase) * 0.5 + 0.5;
            const currentOpacity = particle.opacity * (0.7 + pulse * 0.3);

            // Draw particle
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = this.config.colors.white + currentOpacity + ')';
            this.ctx.fill();

            // Draw connections
            for (let j = i + 1; j < this.particles.length; j++) {
                const p2 = this.particles[j];
                const dx = particle.x - p2.x;
                const dy = particle.y - p2.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < this.config.maxDistance) {
                    const opacity = (1 - distance / this.config.maxDistance) * 0.3;

                    this.ctx.beginPath();
                    this.ctx.moveTo(particle.x, particle.y);
                    this.ctx.lineTo(p2.x, p2.y);

                    const gradient = this.ctx.createLinearGradient(
                        particle.x, particle.y, p2.x, p2.y
                    );
                    gradient.addColorStop(0, this.config.colors.primary + opacity + ')');
                    gradient.addColorStop(1, this.config.colors.secondary + opacity + ')');

                    this.ctx.strokeStyle = gradient;
                    this.ctx.lineWidth = 0.5;
                    this.ctx.stroke();
                }
            }
        });
    }

    drawWaves() {
        this.waves.forEach(wave => {
            this.ctx.beginPath();
            this.ctx.moveTo(0, wave.yPosition);

            for (let x = 0; x <= this.canvas.width; x += 5) {
                const y = wave.yPosition +
                    Math.sin(x * wave.frequency + this.time * wave.speed + wave.offset) * wave.amplitude;
                this.ctx.lineTo(x, y);
            }

            this.ctx.lineTo(this.canvas.width, this.canvas.height);
            this.ctx.lineTo(0, this.canvas.height);
            this.ctx.closePath();

            const gradient = this.ctx.createLinearGradient(0, wave.yPosition, 0, this.canvas.height);
            gradient.addColorStop(0, this.config.colors.primary + wave.opacity + ')');
            gradient.addColorStop(1, this.config.colors.primary + '0)');

            this.ctx.fillStyle = gradient;
            this.ctx.fill();
        });
    }

    drawNeuralNetwork() {
        // Draw neural network-like connections based on mouse movement
        const nodes = 8;
        const radius = 150;
        const centerX = this.mousePos.x || this.canvas.width / 2;
        const centerY = this.mousePos.y || this.canvas.height / 2;

        for (let i = 0; i < nodes; i++) {
            const angle = (i / nodes) * Math.PI * 2 + this.time * 0.02;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;

            // Draw node
            this.ctx.beginPath();
            this.ctx.arc(x, y, 4, 0, Math.PI * 2);
            this.ctx.fillStyle = this.config.colors.accent + '0.6)';
            this.ctx.fill();

            // Draw connections to center
            this.ctx.beginPath();
            this.ctx.moveTo(centerX, centerY);
            this.ctx.lineTo(x, y);
            this.ctx.strokeStyle = this.config.colors.accent + '0.2)';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();

            // Draw connections between nodes
            for (let j = i + 1; j < nodes; j++) {
                const angle2 = (j / nodes) * Math.PI * 2 + this.time * 0.02;
                const x2 = centerX + Math.cos(angle2) * radius;
                const y2 = centerY + Math.sin(angle2) * radius;

                this.ctx.beginPath();
                this.ctx.moveTo(x, y);
                this.ctx.lineTo(x2, y2);
                this.ctx.strokeStyle = this.config.colors.secondary + '0.1)';
                this.ctx.lineWidth = 0.5;
                this.ctx.stroke();
            }
        }
    }

    drawGlowEffect() {
        // Radial glow at mouse position
        if (this.mousePos.x > 0 && this.mousePos.y > 0) {
            const gradient = this.ctx.createRadialGradient(
                this.mousePos.x, this.mousePos.y, 0,
                this.mousePos.x, this.mousePos.y, 200
            );

            gradient.addColorStop(0, this.config.colors.primary + '0.15)');
            gradient.addColorStop(0.5, this.config.colors.secondary + '0.08)');
            gradient.addColorStop(1, this.config.colors.primary + '0)');

            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    drawGrid() {
        const gridSize = 50;
        const gridOpacity = 0.03;

        this.ctx.strokeStyle = this.config.colors.white + gridOpacity + ')';
        this.ctx.lineWidth = 0.5;

        // Vertical lines with perspective effect
        for (let x = 0; x < this.canvas.width; x += gridSize) {
            const offset = Math.sin(x * 0.01 + this.time * 0.01) * 10;
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x + offset, this.canvas.height);
            this.ctx.stroke();
        }

        // Horizontal lines with perspective effect
        for (let y = 0; y < this.canvas.height; y += gridSize) {
            const offset = Math.sin(y * 0.01 + this.time * 0.01) * 10;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y + offset);
            this.ctx.stroke();
        }
    }

    clear() {
        // Gradient background
        const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        gradient.addColorStop(0, '#0f172a');
        gradient.addColorStop(0.5, '#1e3a8a');
        gradient.addColorStop(1, '#0f172a');

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    animate() {
        this.time++;

        this.clear();
        this.drawGrid();
        this.drawWaves();
        this.drawGlowEffect();
        this.drawParticles();
        this.drawNeuralNetwork();

        requestAnimationFrame(() => this.animate());
    }
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new BackgroundAnimation('bg-canvas');
    });
} else {
    new BackgroundAnimation('bg-canvas');
}
