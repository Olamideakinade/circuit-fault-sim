import { SimulatorEngine } from './engine.js';

const engine = new SimulatorEngine();
const canvas = document.getElementById('sim-canvas');
const ctx = canvas.getContext('2d');

const App = {
    init() {
        window.addEventListener('keydown', (e) => this.handleKeyboard(e));
        this.renderLoop();
    },
    handleKeyboard(e) {
        if (e.ctrlKey && e.key === 's') {
            const data = JSON.stringify(engine.serialize());
            const blob = new Blob([data], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'circuit.json';
            a.click();
        }
    },
    renderLoop() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        requestAnimationFrame(() => this.renderLoop());
    }
};

App.init();