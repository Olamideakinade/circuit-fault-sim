export class SimulatorEngine {
    constructor() {
        this.components = new Map();
        this.wires = [];
        this.nextId = 1;
        this.isRunning = false;
        this.faultMode = 'NONE';
        this.selectedComponentId = null;
        this.clockCycles = 0;
        this.history = [];
    }

    addComponent(type, x, y) {
        this.saveState();
        const id = `comp_${this.nextId++}`;
        let inputs = 2;
        if (type === 'NOT' || type === 'INPUT' || type === 'OUTPUT') {
            inputs = 1;
        }
        
        const component = {
            id,
            type,
            x,
            y,
            inputs,
            state: 0,
            outputs: [0]
        };
        this.components.set(id, component);
        return id;
    }

    removeComponent(id) {
        this.saveState();
        this.components.delete(id);
        this.wires = this.wires.filter(w => w.fromComp !== id && w.toComp !== id);
        if (this.selectedComponentId === id) {
            this.selectedComponentId = null;
        }
    }

    addWire(fromComp, fromPin, toComp, toPin) {
        this.saveState();
        // Prevent duplicate wire or invalid connection
        const exists = this.wires.some(w => w.toComp === toComp && w.toPin === toPin);
        if (!exists) {
            this.wires.push({
                fromComp,
                fromPin,
                toComp,
                toPin,
                state: 0
            });
        }
    }

    clear() {
        this.saveState();
        this.components.clear();
        this.wires = [];
        this.clockCycles = 0;
        this.selectedComponentId = null;
    }

    saveState() {
        if (this.history.length > 20) this.history.shift();
        this.history.push(this.exportJSON());
    }

    undo() {
        if (this.history.length > 0) {
            const prevState = this.history.pop();
            this.importJSON(prevState, false);
        }
    }

    getComponentPins(comp) {
        const pins = [];
        if (comp.type === 'INPUT') {
            pins.push({ name: 'out', x: comp.x + 60, y: comp.y + 20, state: comp.state });
        } else if (comp.type === 'OUTPUT') {
            pins.push({ name: 'in', x: comp.x, y: comp.y + 20, state: comp.state });
        } else if (comp.type === 'NOT') {
            pins.push({ name: 'in', x: comp.x, y: comp.y + 20, state: 0 });
            pins.push({ name: 'out', x: comp.x + 60, y: comp.y + 20, state: comp.state });
        } else {
            pins.push({ name: 'in1', x: comp.x, y: comp.y + 10, state: 0 });
            pins.push({ name: 'in2', x: comp.x, y: comp.y + 30, state: 0 });
            pins.push({ name: 'out', x: comp.x + 60, y: comp.y + 20, state: comp.state });
        }
        return pins;
    }

    step() {
        this.clockCycles++;
        // Propagate wire states from outputs
        this.wires.forEach(w => {
            const src = this.components.get(w.fromComp);
            if (src) {
                w.state = src.state;
            }
        });

        // Compute component logic
        for (let comp of this.components.values()) {
            if (comp.type === 'INPUT') continue;

            const incomingWires = this.wires.filter(w => w.toComp === comp.id);
            let val1 = 0;
            let val2 = 0;

            incomingWires.forEach(w => {
                if (w.toPin === 'in' || w.toPin === 'in1') val1 = w.state;
                if (w.toPin === 'in2') val2 = w.state;
            });

            let res = 0;
            switch (comp.type) {
                case 'AND': res = val1 & val2; break;
                case 'OR': res = val1 | val2; break;
                case 'XOR': res = val1 ^ val2; break;
                case 'NOT': res = val1 ? 0 : 1; break;
                case 'NAND': res = (val1 & val2) ? 0 : 1; break;
                case 'NOR': res = (val1 | val2) ? 0 : 1; break;
                case 'OUTPUT': res = val1; break;
                case 'FLIP_FLOP': res = val1; break;
            }

            if (this.faultMode === 'SA0') res = 0;
            if (this.faultMode === 'SA1') res = 1;

            comp.state = res;
        }
    }

    exportJSON() {
        const data = {
            version: '1.4.0',
            nextId: this.nextId,
            clockCycles: this.clockCycles,
            components: Array.from(this.components.entries()),
            wires: this.wires
        };
        return JSON.stringify(data, null, 2);
    }

    importJSON(jsonString, recordHistory = true) {
        if (recordHistory) this.saveState();
        const data = JSON.parse(jsonString);
        this.nextId = data.nextId || 1;
        this.clockCycles = data.clockCycles || 0;
        this.components = new Map(data.components);
        this.wires = data.wires || [];
    }
}
