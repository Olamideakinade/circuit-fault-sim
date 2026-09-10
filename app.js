import { SimulatorEngine } from './engine.js';
import { TestSuite } from './tests.js';

const engine = new SimulatorEngine();
const testSuite = new TestSuite();

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
        this.setupEventListeners();
        this.setupTestPanel();
        requestAnimationFrame((t) => this.loop(t));
    },

    resizeCanvas() {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
    },

    setupEventListeners() {
        document.querySelectorAll('.palette-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                activeComponentType = e.target.dataset.type;
                document.querySelectorAll('.palette-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });

        const playBtn = document.getElementById('btn-play');
        if (playBtn) {
            playBtn.addEventListener('click', () => {
                engine.isRunning = !engine.isRunning;
                playBtn.textContent = engine.isRunning ? 'Pause' : 'Play';
                playBtn.classList.toggle('running', engine.isRunning);
            });
        }

        const stepBtn = document.getElementById('btn-step');
        if (stepBtn) {
            stepBtn.addEventListener('click', () => {
                engine.step();
            });
        }

        const undoBtn = document.getElementById('btn-undo');
        if (undoBtn) {
            undoBtn.addEventListener('click', () => {
                engine.undo();
            });
        }

        canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    },

    setupTestPanel() {
        const runTestsBtn = document.getElementById('btn-run-tests');
        const runBenchBtn = document.getElementById('btn-run-bench');
        const testOutput = document.getElementById('test-output');

        if (runTestsBtn && testOutput) {
            runTestsBtn.addEventListener('click', () => {
                const results = testSuite.runTests();
                let html = `<strong>Tests Passed: ${results.passed} | Failed: ${results.failed}</strong><ul>`;
                results.results.forEach(r => {
                    const color = r.status === 'PASS' ? '#10b981' : '#f43f5e';
                    html += `<li style="color: ${color};">[${r.status}] ${r.name} ${r.error ? '- ' + r.error : ''}</li>`;
                });
                html += '</ul>';
                testOutput.innerHTML = html;
            });
        }

        if (runBenchBtn && testOutput) {
            runBenchBtn.addEventListener('click', () => {
                const bench = testSuite.runBenchmarks();
                testOutput.innerHTML = `<strong>Benchmark Results</strong><br>` +
                    `Iterations: ${bench.iterations}<br>` +
                    `Duration: ${bench.durationMs} ms<br>` +
                    `Throughput: ${bench.ticksPerSec} ticks/sec`;
            });
        }
    },

    onMouseDown(e) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (activeComponentType) {
            engine.addComponent(activeComponentType, x, y);
            activeComponentType = null;
            document.querySelectorAll('.palette-btn').forEach(b => b.classList.remove('active'));
            return;
        }

        // Check component click
        for (const [id, comp] of engine.components.entries()) {
            if (x >= comp.x && x <= comp.x + 60 && y >= comp.y && y <= comp.y + 40) {
                engine.selectedComponentId = id;
                isDragging = true;
                draggedComponent = comp;
                dragOffsetX = x - comp.x;
                dragOffsetY = y - comp.y;
                return;
            }
        }

        engine.selectedComponentId = null;
    },

    onMouseMove(e) {
        const rect = canvas.getBoundingClientRect();
        currentMouseX = e.clientX - rect.left;
        currentMouseY = e.clientY - rect.top;

        if (isDragging && draggedComponent) {
            draggedComponent.x = currentMouseX - dragOffsetX;
            draggedComponent.y = currentMouseY - dragOffsetY;
        }
    },

    onMouseUp(e) {
        isDragging = false;
        draggedComponent = null;
    },

    loop(timestamp) {
        const dt = timestamp - lastTime;
        frameCount++;
        if (dt >= 1000) {
            fps = Math.round((frameCount * 1000) / dt);
            frameCount = 0;
            lastTime = timestamp;
        }

        if (engine.isRunning) {
            engine.step();
        }

        this.render();
        requestAnimationFrame((t) => this.loop(t));
    },

    render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw Grid
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        const gridSize = 20;
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

        // Draw Wires
        for (const wire of engine.wires) {
            const fromComp = engine.components.get(wire.fromComp);
            const toComp = engine.components.get(wire.toComp);
            if (fromComp && toComp) {
                ctx.strokeStyle = wire.signal ? '#38bdf8' : '#334155';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(fromComp.x + 60, fromComp.y + 20);
                ctx.lineTo(toComp.x, toComp.y + 20);
                ctx.stroke();
            }
        }

        // Draw Components
        for (const [id, comp] of engine.components.entries()) {
            ctx.fillStyle = engine.selectedComponentId === id ? '#1e293b' : '#0f172a';
            ctx.strokeStyle = comp.output ? '#38bdf8' : '#334155';
            ctx.lineWidth = 2;
            
            ctx.fillRect(comp.x, comp.y, 60, 40);
            ctx.strokeRect(comp.x, comp.y, 60, 40);

            ctx.fillStyle = '#f8fafc';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(comp.type, comp.x + 30, comp.y + 20);
        }

        // Draw FPS
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`FPS: ${fps} | Cycles: ${engine.clockCycles}`, 10, 20);
    }
};

window.addEventListener('DOMContentLoaded', () => App.init());
