import { SimulatorEngine } from './engine.js';

const engine = new SimulatorEngine();
const canvas = document.getElementById('sim-canvas');
const ctx = canvas.getContext('2d');

let activeComponentType = null;
let isDragging = false;
let draggedComponent = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let wireStartComp = null;
let wireStartPin = null;
let currentMouseX = 0;
let currentMouseY = 0;

let lastTime = performance.now();
let frameCount = 0;
let fps = 60;

const App = {
    init() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        this.bindEvents();
        this.loadAutoSave();
        requestAnimationFrame((t) => this.loop(t));
    },

    resizeCanvas() {
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
    },

    bindEvents() {
        canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));

        document.querySelectorAll('.palette-item').forEach(item => {
            item.addEventListener('click', (e) => {
                document.querySelectorAll('.palette-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                activeComponentType = item.dataset.type;
            });
        });

        document.getElementById('btn-step').addEventListener('click', () => {
            engine.step();
            this.updateTelemetry();
        });

        const btnPlay = document.getElementById('btn-play');
        btnPlay.addEventListener('click', () => {
            engine.isRunning = !engine.isRunning;
            btnPlay.textContent = engine.isRunning ? 'Pause' : 'Play';
            btnPlay.classList.toggle('active', engine.isRunning);
        });

        document.getElementById('btn-clear').addEventListener('click', () => {
            if (confirm('Are you sure you want to clear the circuit?')) {
                engine.clear();
                this.updateTelemetry();
            }
        });

        document.getElementById('btn-export').addEventListener('click', () => {
            const data = engine.exportJSON();
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'circuit-design.json';
            a.click();
            URL.revokeObjectURL(url);
        });

        document.getElementById('btn-import').addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        try {
                            engine.importJSON(event.target.result);
                            this.updateTelemetry();
                        } catch (err) {
                            alert('Failed to import circuit: ' + err.message);
                        }
                    };
                    reader.readAsText(file);
                }
            };
            input.click();
        });

        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (e.code === 'Space') {
                e.preventDefault();
                document.getElementById('btn-play').click();
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                if (engine.selectedComponentId) {
                    engine.removeComponent(engine.selectedComponentId);
                    this.updateTelemetry();
                }
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                engine.undo();
                this.updateTelemetry();
            }
        });
    },

    onMouseDown(e) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (activeComponentType) {
            engine.addComponent(activeComponentType, x, y);
            activeComponentType = null;
            document.querySelectorAll('.palette-item').forEach(i => i.classList.remove('active'));
            this.updateTelemetry();
            return;
        }

        const clickedPin = this.findPinAt(x, y);
        if (clickedPin) {
            wireStartComp = clickedPin.comp;
            wireStartPin = clickedPin.pin;
            return;
        }

        const clickedComp = this.findComponentAt(x, y);
        if (clickedComp) {
            engine.selectedComponentId = clickedComp.id;
            isDragging = true;
            draggedComponent = clickedComp;
            dragOffsetX = x - clickedComp.x;
            dragOffsetY = y - clickedComp.y;
            if (clickedComp.type === 'INPUT') {
                clickedComp.state = clickedComp.state ? 0 : 1;
            }
            this.updateTelemetry();
            return;
        }

        engine.selectedComponentId = null;
        this.updateTelemetry();
    },

    onMouseMove(e) {
        const rect = canvas.getBoundingClientRect();
        currentMouseX = e.clientX - rect.left;
        currentMouseY = e.clientY - rect.top;

        if (isDragging && draggedComponent) {
            draggedComponent.x = Math.round((currentMouseX - dragOffsetX) / 20) * 20;
            draggedComponent.y = Math.round((currentMouseY - dragOffsetY) / 20) * 20;
        }
    },

    onMouseUp(e) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (wireStartComp) {
            const targetPin = this.findPinAt(x, y);
            if (targetPin && targetPin.comp !== wireStartComp) {
                engine.addWire(wireStartComp, wireStartPin, targetPin.comp, targetPin.pin);
            }
            wireStartComp = null;
            wireStartPin = null;
        }

        isDragging = false;
        draggedComponent = null;
        this.saveAutoSave();
    },

    findComponentAt(x, y) {
        for (let comp of engine.components.values()) {
            if (x >= comp.x - 10 && x <= comp.x + 70 && y >= comp.y - 10 && y <= comp.y + 50) {
                return comp;
            }
        }
        return null;
    },

    findPinAt(x, y) {
        for (let comp of engine.components.values()) {
            const pins = engine.getComponentPins(comp);
            for (let p of pins) {
                const dx = x - p.x;
                const dy = y - p.y;
                if (dx * dx + dy * dy <= 8 * 8) {
                    return { comp, pin: p.name };
                }
            }
        }
        return null;
    },

    loadAutoSave() {
        const saved = localStorage.getItem('circuit_autosave');
        if (saved) {
            try {
                engine.importJSON(saved);
            } catch (err) {
                console.error('Auto-load failed', err);
            }
        }
    },

    saveAutoSave() {
        localStorage.setItem('circuit_autosave', engine.exportJSON());
    },

    updateTelemetry() {
        document.getElementById('telemetry-fps').textContent = Math.round(fps);
        document.getElementById('telemetry-components').textContent = engine.components.size;
        document.getElementById('telemetry-wires').textContent = engine.wires.length;
        document.getElementById('telemetry-cycles').textContent = engine.clockCycles;
    },

    loop(timestamp) {
        frameCount++;
        if (timestamp - lastTime >= 1000) {
            fps = frameCount;
            frameCount = 0;
            lastTime = timestamp;
            this.updateTelemetry();
        }

        if (engine.isRunning) {
            engine.step();
        }

        this.render();
        requestAnimationFrame((t) => this.loop(t));
    },

    render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Render Grid
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 20) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 20) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }

        // Render Wires
        engine.wires.forEach(w => {
            const srcComp = engine.components.get(w.fromComp);
            const dstComp = engine.components.get(w.toComp);
            if (srcComp && dstComp) {
                const srcPin = engine.getComponentPins(srcComp).find(p => p.name === w.fromPin);
                const dstPin = engine.getComponentPins(dstComp).find(p => p.name === w.toPin);
                if (srcPin && dstPin) {
                    ctx.strokeStyle = w.state === 1 ? '#38bdf8' : '#334155';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(srcPin.x, srcPin.y);
                    const midX = (srcPin.x + dstPin.x) / 2;
                    ctx.lineTo(midX, srcPin.y);
                    ctx.lineTo(midX, dstPin.y);
                    ctx.lineTo(dstPin.x, dstPin.y);
                    ctx.stroke();
                }
            }
        });

        // Render Active Wire Creation
        if (wireStartComp) {
            const startPin = engine.getComponentPins(wireStartComp).find(p => p.name === wireStartPin);
            if (startPin) {
                ctx.strokeStyle = '#f59e0b';
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.moveTo(startPin.x, startPin.y);
                ctx.lineTo(currentMouseX, currentMouseY);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }

        // Render Components
        for (let comp of engine.components.values()) {
            ctx.fillStyle = engine.selectedComponentId === comp.id ? '#1e293b' : '#0f172a';
            ctx.strokeStyle = engine.selectedComponentId === comp.id ? '#38bdf8' : '#334155';
            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.roundRect(comp.x, comp.y, 60, 40, 6);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#f8fafc';
            ctx.font = '12px var(--font-sans)';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            let label = comp.type;
            if (comp.type === 'INPUT') label = `IN:${comp.state}`;
            if (comp.type === 'OUTPUT') label = `OUT:${comp.state}`;
            ctx.fillText(label, comp.x + 30, comp.y + 20);

            // Render Pins
            const pins = engine.getComponentPins(comp);
            pins.forEach(p => {
                ctx.fillStyle = p.state === 1 ? '#38bdf8' : '#64748b';
                ctx.beginPath();
                ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
                ctx.fill();
            });
        }
    }
};

window.addEventListener('DOMContentLoaded', () => App.init());
