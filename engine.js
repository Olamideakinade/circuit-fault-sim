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
            inputs: new Array(inputs).fill(false),
            output: false,
            fault: null // { type: 'SA0' | 'SA1' }
        };
        this.components.set(id, component);
        return id;
    }

    removeComponent(id) {
        this.saveState();
        if (this.components.has(id)) {
            this.components.delete(id);
            this.wires = this.wires.filter(w => w.fromComp !== id && w.toComp !== id);
            if (this.selectedComponentId === id) {
                this.selectedComponentId = null;
            }
        }
    }

    addWire(fromComp, fromPin, toComp, toPin) {
        this.saveState();
        // Prevent duplicate wires to the same input pin
        this.wires = this.wires.filter(w => !(w.toComp === toComp && w.toPin === toPin));
        this.wires.push({ fromComp, fromPin, toComp, toPin, signal: false });
    }

    removeWire(index) {
        this.saveState();
        if (index >= 0 && index < this.wires.length) {
            this.wires.splice(index, 1);
        }
    }

    saveState() {
        const state = {
            components: Array.from(this.components.entries()),
            wires: JSON.parse(JSON.stringify(this.wires)),
            clockCycles: this.clockCycles
        };
        this.history.push(JSON.stringify(state));
        if (this.history.length > 50) {
            this.history.shift();
        }
    }

    undo() {
        if (this.history.length === 0) return false;
        const prevState = JSON.parse(this.history.pop());
        this.components = new Map(prevState.components);
        this.wires = prevState.wires;
        this.clockCycles = prevState.clockCycles;
        return true;
    }

    step() {
        // 1. Propagate signals through wires
        for (const wire of this.wires) {
            const sourceComp = this.components.get(wire.fromComp);
            if (sourceComp) {
                wire.signal = sourceComp.output;
            }
        }

        // 2. Update component inputs from connected wires
        for (const [id, comp] of this.components.entries()) {
            for (let i = 0; i < comp.inputs.length; i++) {
                const incomingWire = this.wires.find(w => w.toComp === id && w.toPin === i);
                if (incomingWire) {
                    comp.inputs[i] = incomingWire.signal;
                } else if (comp.type !== 'INPUT') {
                    comp.inputs[i] = false;
                }
            }
        }

        // 3. Compute component outputs based on logic type
        for (const [id, comp] of this.components.entries()) {
            let computed = false;
            switch (comp.type) {
                case 'INPUT':
                    computed = comp.inputs[0];
                    break;
                case 'OUTPUT':
                    computed = comp.inputs[0];
                    break;
                case 'NOT':
                    computed = !comp.inputs[0];
                    break;
                case 'AND':
                    computed = comp.inputs.every(val => val === true);
                    break;
                case 'OR':
                    computed = comp.inputs.some(val => val === true);
                    break;
                case 'XOR':
                    computed = comp.inputs.reduce((acc, val) => acc !== val, false);
                    break;
                case 'NAND':
                    computed = !comp.inputs.every(val => val === true);
                    break;
                case 'NOR':
                    computed = !comp.inputs.some(val => val === true);
                    break;
                default:
                    computed = false;
            }

            // Apply fault injection if present
            if (comp.fault) {
                if (comp.fault.type === 'SA0') {
                    computed = false;
                } else if (comp.fault.type === 'SA1') {
                    computed = true;
                }
            }

            comp.output = computed;
        }

        this.clockCycles++;
    }

    exportJSON() {
        return JSON.stringify({
            version: '1.5.0',
            components: Array.from(this.components.entries()),
            wires: this.wires,
            clockCycles: this.clockCycles
        }, null, 2);
    }

    importJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            this.components = new Map(data.components);
            this.wires = data.wires || [];
            this.clockCycles = data.clockCycles || 0;
            this.history = [];
            return true;
        } catch (e) {
            console.error('Failed to import circuit JSON:', e);
            return false;
        }
    }
}
