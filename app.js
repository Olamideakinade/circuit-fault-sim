import { SimulatorEngine } from './engine.js';

const engine = new SimulatorEngine();
const canvas = document.getElementById('sim-canvas');
const ctx = canvas.getContext('2d');

let currentTool = 'select';
let isRunning = false;
let runInterval = null;
let selectedComponent = null;
let wireStart = null;
let mousePos = { x: 0, y: 0 };
let pan = { x: 0, y: 0 };
let zoom = 1;
let isDraggingCanvas = false;
let dragStart = { x: 0, y: 0 };

function resizeCanvas() {
    const parent = canvas.parentElement;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
    draw();
}

window.addEventListener('resize', resizeCanvas);

// UI Bindings
document.getElementById('select-tool').addEventListener('change', (e) => {
    currentTool = e.target.value;
    wireStart = null;
});

document.getElementById('btn-step').addEventListener('click', () => {
    engine.step();
    updateStatus();
    draw();
});

document.getElementById('btn-run').addEventListener('click', () => {
    if (isRunning) return;
    isRunning = true;
    document.getElementById('btn-run').disabled = true;
    document.getElementById('btn-stop').disabled = false;
    document.getElementById('btn-step').disabled = true;

    runInterval = setInterval(() => {
        engine.step();
        updateStatus();
        draw();
    }, 100);
});

document.getElementById('btn-stop').addEventListener('click', () => {
    stopRunning();
});

function stopRunning() {
    isRunning = false;
    clearInterval(runInterval);
    document.getElementById('btn-run').disabled = false;
    document.getElementById('btn-stop').disabled = true;
    document.getElementById('btn-step').disabled = false;
}

document.getElementById('btn-reset').addEventListener('click', () => {
    stopRunning();
    engine.time = 0;
    engine.eventQueue = [];
    updateStatus();
    draw();
});

document.getElementById('btn-clear').addEventListener('click', () => {
    stopRunning();
    engine.reset();
    selectedComponent = null;
    updateInspector();
    updateStatus();
    draw();
});

// Canvas Interaction
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    if (e.button === 1 || currentTool === 'select' && e.shiftKey) {
        isDraggingCanvas = true;
        dragStart = { x: e.clientX - pan.x, y: e.clientY - pan.y };
        return;
    }

    if (currentTool === 'select') {
        selectedComponent = null;
        for (let [id, comp] of engine.components) {
            if (x >= comp.x && x <= comp.x + 60 && y >= comp.y && y <= comp.y + 40) {
                selectedComponent = comp;
                break;
            }
        }
        updateInspector();
        draw();
    } else if (currentTool === 'wire') {
        for (let [id, comp] of engine.components) {
            if (x >= comp.x && x <= comp.x + 60 && y >= comp.y && y <= comp.y + 40) {
                if (!wireStart) {
                    wireStart = { comp: id, pin: 0 };
                } else {
                    engine.addWire(wireStart.comp, wireStart.pin, id, 0);
                    wireStart = null;
                }
                break;
            }
        }
        draw();
    } else {
        // Place component
        engine.addComponent(currentTool, Math.round(x / 20) * 20, Math.round(y / 20) * 20);
        updateStatus();
        draw();
    }
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mousePos.x = (e.clientX - rect.left - pan.x) / zoom;
    mousePos.y = (e.clientY - rect.top - pan.y) / zoom;

    document.getElementById('status-coords').textContent = `X: ${Math.round(mousePos.x)} | Y: ${Math.round(mousePos.y)}`;

    if (isDraggingCanvas) {
        pan.x = e.clientX - dragStart.x;
        pan.y = e.clientY - dragStart.y;
        draw();
    }
});

canvas.addEventListener('mouseup', () => {
    isDraggingCanvas = false;
});

canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = 1.1;
    if (e.deltaY < 0) {
        zoom *= zoomFactor;
    } else {
        zoom /= zoomFactor;
    }
    draw();
}, { passive: false });

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw grid
    ctx.strokeStyle = '#202024';
    ctx.lineWidth = 1;
    const gridSize = 20;
    const startX = Math.floor(-pan.x / zoom / gridSize) * gridSize;
    const startY = Math.floor(-pan.y / zoom / gridSize) * gridSize;
    const endX = startX + canvas.width / zoom;
    const endY = startY + canvas.height / zoom;

    for (let x = startX; x < endX; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
        ctx.stroke();
    }
    for (let y = startY; y < endY; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
    }

    // Draw wires
    for (const wire of engine.wires) {
        const fromComp = engine.components.get(wire.from.comp);
        const toComp = engine.components.get(wire.to.comp);
        if (fromComp && toComp) {
            ctx.strokeStyle = wire.state === 1 ? '#3b82f6' : '#52525b';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(fromComp.x + 60, fromComp.y + 20);
            ctx.lineTo(toComp.x, toComp.y + 20);
            ctx.stroke();
        }
    }

    // Draw components
    for (let [id, comp] of engine.components) {
        ctx.fillStyle = '#18181b';
        ctx.strokeStyle = selectedComponent === id ? '#3b82f6' : '#27272a';
        if (comp.fault) ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;

        ctx.fillRect(comp.x, comp.y, 60, 40);
        ctx.strokeRect(comp.x, comp.y, 60, 40);

        ctx.fillStyle = '#f4f4f5';
        ctx.font = '12px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(comp.type, comp.x + 30, comp.y + 20);

        // State indicator
        ctx.fillStyle = comp.state === 1 ? '#22c55e' : '#52525b';
        ctx.beginPath();
        ctx.arc(comp.x + 30, comp.y - 6, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

function updateStatus() {
    document.getElementById('status-sim-time').textContent = `Simulation Time: ${engine.time} ns`;
    const netlistHTML = `<pre><code>Nodes: ${engine.components.size}
Gates: ${engine.wires.length}
State: ${isRunning ? 'Running' : 'Idle'}</code></pre>`;
    document.getElementById('netlist-status').innerHTML = netlistHTML;
}

function updateInspector() {
    const container = document.getElementById('inspector-content');
    if (!selectedComponent) {
        container.innerHTML = `<p class="muted">Select a component to inspect or configure faults.</p>`;
        return;
    }

    container.innerHTML = `
        <div class="form-group">
            <label>ID</label>
            <input type="text" class="form-control" value="${selectedComponent.id}" readonly>
        </div>
        <div class="form-group">
            <label>Type</label>
            <input type="text" class="form-control" value="${selectedComponent.type}" readonly>
        </div>
        <div class="form-group">
            <label>Propagation Delay (ns)</label>
            <input type="number" id="input-delay" class="form-control" value="${selectedComponent.delay}" min="1">
        </div>
        <div class="form-group">
            <label>Fault Injection</label>
            <select id="select-fault" class="form-control">
                <option value="" ${!selectedComponent.fault ? 'selected' : ''}>None</option>
                <option value="SA0" ${selectedComponent.fault === 'SA0' ? 'selected' : ''}>Stuck-at 0 (SA0)</option>
                <option value="SA1" ${selectedComponent.fault === 'SA1' ? 'selected' : ''}>Stuck-at 1 (SA1)</option>
            </select>
        </div>
        <button id="btn-delete-comp" class="btn btn-danger" style="width: 100%; margin-top: 0.5rem;">Delete Component</button>
    `;

    document.getElementById('input-delay').addEventListener('change', (e) => {
        selectedComponent.delay = parseInt(e.target.value) || 1;
    });

    document.getElementById('select-fault').addEventListener('change', (e) => {
        selectedComponent.fault = e.target.value || null;
        draw();
    });

    document.getElementById('btn-delete-comp').addEventListener('click', () => {
        engine.removeComponent(selectedComponent.id);
        selectedComponent = null;
        updateInspector();
        updateStatus();
        draw();
    });
}

resizeCanvas();
updateStatus();
