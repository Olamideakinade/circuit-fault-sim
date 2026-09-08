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
let lastTime = performance.now();
let frameCount = 0;
let fps = 60;

const App = {
    init() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        window.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        this.setupUI();
        this.setupCanvasEvents();
        this.renderLoop();
    },

    resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    },

    setupUI() {
        document.querySelectorAll('.component-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.component-item').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeComponentType = btn.getAttribute('data-type');
                document.getElementById('status-text').textContent = `Selected: ${activeComponentType}. Click canvas to place.`;
            });
        });

        document.getElementById('btn-step').addEventListener('click', () => {
            engine.step();
        });

        const btnRun = document.getElementById('btn-run');
        const btnPause = document.getElementById('btn-pause');

        btnRun.addEventListener('click', () => {
            engine.isRunning = true;
            btnRun.style.display = 'none';
            btnPause.style.display = 'inline-block';
            document.getElementById('status-text').textContent = 'Simulation running...';
        });

        btnPause.addEventListener('click', () => {
            engine.isRunning = false;
            btnPause.style.display = 'none';
            btnRun.style.display = 'inline-block';
            document.getElementById('status-text').textContent = 'Simulation paused.';
        });

        document.getElementById('btn-reset').addEventListener('click', () => {
            engine.reset();
            document.getElementById('status-text').textContent = 'Simulation reset.';
        });

        document.getElementById('btn-export').addEventListener('click', () => {
            const data = JSON.stringify(engine.serialize(), null, 2);
            const blob = new Blob([data], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'circuit-fault-sim.json';
            a.click();
            URL.revokeObjectURL(url);
            document.getElementById('status-text').textContent = 'Circuit exported successfully.';
        });

        const fileInput = document.getElementById('file-input');
        document.getElementById('btn-import').addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    if (engine.deserialize(data)) {
                        document.getElementById('status-text').textContent = 'Circuit imported successfully.';
                    } else {
                        alert('Invalid circuit data structure.');
                    }
                } catch (err) {
                    alert('Failed to parse JSON file.');
                }
            };
            reader.readAsText(file);
            fileInput.value = '';
        });

        document.getElementById('btn-inject').addEventListener('click', () => {
            if (engine.selectedComponentId) {
                const faultType = document.getElementById('fault-type').value;
                engine.injectFault(engine.selectedComponentId, faultType);
                document.getElementById('status-text').textContent = `Injected ${faultType} fault into component ${engine.selectedComponentId}.`;
            } else {
                alert('Select a component on the canvas first.');
            }
        });
    },

    setupCanvasEvents() {
        canvas.addEventListener('mousedown', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Check component click
            let clickedComp = null;
            for (const [id, comp] of engine.components) {
                if (x >= comp.x - 30 && x <= comp.x + 30 && y >= comp.y - 20 && y <= comp.y + 20) {
                    clickedComp = comp;
                    break;
                }
            }

            if (clickedComp) {
                engine.selectedComponentId = clickedComp.id;
                if (e.shiftKey) {
                    // Wire creation start
                    wireStartComp = clickedComp;
                } else {
                    isDragging = true;
                    draggedComponent = clickedComp;
                    dragOffsetX = x - clickedComp.x;
                    dragOffsetY = y - clickedComp.y;
                }
                if (clickedComp.type === 'INPUT') {
                    clickedComp.state = clickedComp.state === 0 ? 1 : 0;
                }
            } else if (activeComponentType) {
                engine.addComponent(activeComponentType, x, y);
                document.getElementById('status-text').textContent = `Placed ${activeComponentType}.`;
            } else {
                engine.selectedComponentId = null;
            }
        });

        canvas.addEventListener('mousemove', (e) => {
            if (isDragging && draggedComponent) {
                const rect = canvas.getBoundingClientRect();
                draggedComponent.x = (e.clientX - rect.left) - dragOffsetX;
                draggedComponent.y = (e.clientY - rect.top) - dragOffsetY;
            }
        });

        canvas.addEventListener('mouseup', (e) => {
            if (wireStartComp) {
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                for (const [id, comp] of engine.components) {
                    if (comp.id !== wireStartComp.id && x >= comp.x - 30 && x <= comp.x + 30 && y >= comp.y - 20 && y <= comp.y + 20) {
                        engine.addWire(wireStartComp.id, comp.id);
                        document.getElementById('status-text').textContent = `Connected wire from ${wireStartComp.id} to ${comp.id}.`;
                        break;
                    }
                }
                wireStartComp = null;
            }
            isDragging = false;
            draggedComponent = null;
        });

        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            for (const [id, comp] of engine.components) {
                if (x >= comp.x - 30 && x <= comp.x + 30 && y >= comp.y - 20 && y <= comp.y + 20) {
                    engine.removeComponent(id);
                    document.getElementById('status-text').textContent = `Removed component ${id}.`;
                    break;
                }
            }
        });
    },

    handleKeyboard(e) {
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            document.getElementById('btn-export').click();
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
            if (engine.selectedComponentId) {
                engine.removeComponent(engine.selectedComponentId);
                document.getElementById('status-text').textContent = 'Deleted selected component.';
            }
        }
    },

    renderLoop(timestamp = 0) {
        // Calculate FPS
        frameCount++;
        if (timestamp - lastTime >= 1000) {
            fps = frameCount;
            frameCount = 0;
            lastTime = timestamp;
            document.getElementById('fps-text').textContent = `FPS: ${fps}`;
        }

        if (engine.isRunning) {
            engine.step();
        }

        this.draw();
        requestAnimationFrame((t) => this.renderLoop(t));
    },

    draw() {
        const width = canvas.width / window.devicePixelRatio;
        const height = canvas.height / window.devicePixelRatio;
        ctx.clearRect(0, 0, width, height);

        // Draw grid pattern
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        const gridSize = 30;
        for (let x = 0; x < width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        for (let y = 0; y < height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Draw wires
        for (const wire of engine.wires) {
            const fromComp = engine.components.get(wire.from);
            const toComp = engine.components.get(wire.to);
            if (fromComp && toComp) {
                ctx.beginPath();
                ctx.moveTo(fromComp.x, fromComp.y);
                ctx.lineTo(toComp.x, toComp.y);
                ctx.strokeStyle = wire.state === 1 ? '#38bdf8' : '#334155';
                ctx.lineWidth = 3;
                ctx.stroke();
            }
        }

        // Draw components
        for (const [id, comp] of engine.components) {
            ctx.save();
            ctx.translate(comp.x, comp.y);

            const isSelected = engine.selectedComponentId === comp.id;
            
            // Box background
            ctx.fillStyle = '#1e293b';
            ctx.strokeStyle = isSelected ? '#38bdf8' : (comp.fault !== 'NONE' ? '#f43f5e' : '#475569');
            ctx.lineWidth = isSelected ? 3 : 2;

            ctx.beginPath();
            ctx.roundRect(-32, -22, 64, 44, 8);
            ctx.fill();
            ctx.stroke();

            // State indicator glow
            if (comp.state === 1) {
                ctx.shadowColor = '#38bdf8';
                ctx.shadowBlur = 10;
            }

            // Text label
            ctx.fillStyle = '#f8fafc';
            ctx.font = '600 12px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(comp.type, 0, comp.fault !== 'NONE' ? -6 : 0);

            // Fault badge if active
            if (comp.fault !== 'NONE') {
                ctx.fillStyle = '#f43f5e';
                ctx.font = '700 10px monospace';
                ctx.fillText(`[${comp.fault}]`, 0, 10);
            }

            ctx.restore();
        }

        // Draw active wire preview if shifting
        if (wireStartComp) {
            // Preview state managed in mousemove if needed
        }
    }
};

App.init();
