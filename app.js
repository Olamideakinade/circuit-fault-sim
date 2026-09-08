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
        window.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        document.querySelectorAll('.palette-item').forEach(btn => {
            btn.addEventListener('click', () => {
                activeComponentType = btn.dataset.type;
            });
        });

        document.querySelectorAll('.fault-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (engine.selectedComponentId) {
                    engine.setFault(engine.selectedComponentId, btn.dataset.fault);
                }
            });
        });

        document.getElementById('btn-run').addEventListener('click', () => {
            engine.isRunning = !engine.isRunning;
            const btnRun = document.getElementById('btn-run');
            btnRun.textContent = engine.isRunning ? 'Pause' : 'Run';
            btnRun.classList.toggle('btn-primary', !engine.isRunning);
            btnRun.classList.toggle('btn-danger', engine.isRunning);
        });

        document.getElementById('btn-step').addEventListener('click', () => {
            engine.step();
            this.updateTelemetry();
        });

        document.getElementById('btn-reset').addEventListener('click', () => {
            engine.components.clear();
            engine.wires = [];
            engine.clockCycles = 0;
            engine.selectedComponentId = null;
            this.updateTelemetry();
        });

        document.getElementById('btn-export').addEventListener('click', () => {
            const json = engine.exportJSON();
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `circuit-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        });

        document.getElementById('btn-import').addEventListener('click', () => {
            document.getElementById('file-input').click();
        });

        document.getElementById('file-input').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                if (engine.importJSON(event.target.result)) {
                    this.updateTelemetry();
                } else {
                    alert('Invalid circuit schema format.');
                }
            };
            reader.readAsText(file);
        });

        requestAnimationFrame((t) => this.loop(t));
    },

    resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
    },

    handleKeyboard(e) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (engine.selectedComponentId) {
                engine.removeComponent(engine.selectedComponentId);
                this.updateTelemetry();
            }
        }
    },

    getComponentPins(comp) {
        const width = 80;
        const height = 50;
        const pins = [];

        if (comp.type === 'INPUT') {
            pins.push({ pin: 0, x: comp.x + width, y: comp.y + height / 2, type: 'output' });
        } else if (comp.type === 'OUTPUT') {
            pins.push({ pin: 0, x: comp.x, y: comp.y + height / 2, type: 'input' });
        } else if (comp.type === 'NOT') {
            pins.push({ pin: 0, x: comp.x, y: comp.y + height / 2, type: 'input' });
            pins.push({ pin: 0, x: comp.x + width, y: comp.y + height / 2, type: 'output' });
        } else {
            pins.push({ pin: 0, x: comp.x, y: comp.y + height * 0.3, type: 'input' });
            pins.push({ pin: 1, x: comp.x, y: comp.y + height * 0.7, type: 'input' });
            pins.push({ pin: 0, x: comp.x + width, y: comp.y + height / 2, type: 'output' });
        }
        return pins;
    },

    handleMouseDown(e) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (activeComponentType) {
            engine.addComponent(activeComponentType, x - 40, y - 25);
            activeComponentType = null;
            this.updateTelemetry();
            return;
        }

        // Check pin clicks for wiring
        for (const [id, comp] of engine.components.entries()) {
            const pins = this.getComponentPins(comp);
            for (const pin of pins) {
                const dist = Math.hypot(pin.x - x, pin.y - y);
                if (dist < 10) {
                    if (pin.type === 'output') {
                        wireStartComp = id;
                        wireStartPin = pin.pin;
                        return;
                    } else if (pin.type === 'input' && wireStartComp) {
                        engine.addWire(wireStartComp, wireStartPin, id, pin.pin);
                        wireStartComp = null;
                        wireStartPin = null;
                        this.updateTelemetry();
                        return;
                    }
                }
            }
        }

        // Check component selection / dragging
        let clickedCompId = null;
        for (const [id, comp] of engine.components.entries()) {
            if (x >= comp.x && x <= comp.x + 80 && y >= comp.y && y <= comp.y + 50) {
                clickedCompId = id;
                break;
            }
        }

        if (clickedCompId) {
            const comp = engine.components.get(clickedCompId);
            if (comp.type === 'INPUT') {
                comp.state = comp.state === 1 ? 0 : 1;
            }
            engine.selectedComponentId = clickedCompId;
            isDragging = true;
            draggedComponent = comp;
            dragOffsetX = x - comp.x;
            dragOffsetY = y - comp.y;
        } else {
            engine.selectedComponentId = null;
            wireStartComp = null;
        }
    },

    handleMouseMove(e) {
        const rect = canvas.getBoundingClientRect();
        currentMouseX = e.clientX - rect.left;
        currentMouseY = e.clientY - rect.top;

        if (isDragging && draggedComponent) {
            draggedComponent.x = currentMouseX - dragOffsetX;
            draggedComponent.y = currentMouseY - dragOffsetY;
        }
    },

    handleMouseUp(e) {
        isDragging = false;
        draggedComponent = null;
    },

    updateTelemetry() {
        document.getElementById('tele-comps').textContent = engine.components.size;
        document.getElementById('tele-wires').textContent = engine.wires.length;
        document.getElementById('tele-cycles').textContent = engine.clockCycles;
    },

    loop(timestamp) {
        frameCount++;
        if (timestamp - lastTime >= 1000) {
            fps = frameCount;
            frameCount = 0;
            lastTime = timestamp;
            document.getElementById('tele-fps').textContent = fps;
        }

        if (engine.isRunning) {
            engine.step();
            this.updateTelemetry();
        }

        this.render();
        requestAnimationFrame((t) => this.loop(t));
    },

    render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Render grid background
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        const gridSize = 30;
        for (let x = 0; x < canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }

        // Render wires
        for (const wire of engine.wires) {
            const fromComp = engine.components.get(wire.fromComp);
            const toComp = engine.components.get(wire.toComp);
            if (fromComp && toComp) {
                const fromPins = this.getComponentPins(fromComp);
                const toPins = this.getComponentPins(toComp);
                const outPin = fromPins.find(p => p.type === 'output');
                const inPin = toPins.find(p => p.pin === wire.toPin && p.type === 'input');

                if (outPin && inPin) {
                    ctx.strokeStyle = wire.state === 1 ? '#38bdf8' : '#334155';
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    ctx.moveTo(outPin.x, outPin.y);
                    const midX = (outPin.x + inPin.x) / 2;
                    ctx.bezierCurveTo(midX, outPin.y, midX, inPin.y, inPin.x, inPin.y);
                    ctx.stroke();
                }
            }
        }

        // Render active wire preview
        if (wireStartComp) {
            const fromComp = engine.components.get(wireStartComp);
            if (fromComp) {
                const fromPins = this.getComponentPins(fromComp);
                const outPin = fromPins.find(p => p.type === 'output');
                if (outPin) {
                    ctx.strokeStyle = '#38bdf8';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([4, 4]);
                    ctx.beginPath();
                    ctx.moveTo(outPin.x, outPin.y);
                    ctx.lineTo(currentMouseX, currentMouseY);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }
            }
        }

        // Render components
        for (const [id, comp] of engine.components.entries()) {
            const isSelected = id === engine.selectedComponentId;
            const width = 80;
            const height = 50;

            ctx.fillStyle = '#1e293b';
            ctx.strokeStyle = isSelected ? '#38bdf8' : '#334155';
            ctx.lineWidth = isSelected ? 2 : 1;

            ctx.beginPath();
            ctx.roundRect(comp.x, comp.y, width, height, 6);
            ctx.fill();
            ctx.stroke();

            // Component text label
            ctx.fillStyle = '#f8fafc';
            ctx.font = '12px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(comp.type, comp.x + width / 2, comp.y + height / 2);

            // Fault badge indicator
            if (comp.fault && comp.fault !== 'NONE') {
                ctx.fillStyle = '#f43f5e';
                ctx.font = '10px monospace';
                ctx.fillText(comp.fault, comp.x + width / 2, comp.y - 8);
            }

            // Render pins
            const pins = this.getComponentPins(comp);
            for (const pin of pins) {
                ctx.fillStyle = pin.type === 'output' ? (comp.state === 1 ? '#38bdf8' : '#64748b') : '#64748b';
                ctx.beginPath();
                ctx.arc(pin.x, pin.y, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
};

window.addEventListener('DOMContentLoaded', () => {
    App.init();
});