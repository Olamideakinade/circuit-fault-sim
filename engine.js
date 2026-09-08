export class SimulatorEngine {
    constructor() {
        this.components = new Map();
        this.wires = [];
        this.nextId = 1;
        this.isRunning = false;
        this.faultMode = 'NONE'; // 'NONE', 'SA0', 'SA1'
        this.selectedComponentId = null;
        this.clockCycles = 0;
    }

    addComponent(type, x, y) {
        const id = `comp_${this.nextId++}`;
        let inputs = 2;
        if (type === 'NOT' || type === 'INPUT' || type === 'OUTPUT') {
            inputs = 1;
        }
        if (type === 'FLIP_FLOP') {
            inputs = 2;
        }
        
        this.components.set(id, {
            id,
            type,
            x,
            y,
            state: 0,
            inputs: new Array(inputs).fill(0),
            inputSources: new Array(inputs).fill(null),
            fault: 'NONE'
        });
        return id;
    }

    removeComponent(id) {
        this.components.delete(id);
        this.wires = this.wires.filter(w => w.fromComp !== id && w.toComp !== id);
        if (this.selectedComponentId === id) {
            this.selectedComponentId = null;
        }
    }

    addWire(fromComp, fromPin, toComp, toPin) {
        // Prevent duplicate or self wires
        if (fromComp === toComp) return false;
        
        // Remove existing wire going into the same target pin
        this.wires = this.wires.filter(w => !(w.toComp === toComp && w.toPin === toPin));
        
        this.wires.push({
            fromComp,
            fromPin,
            toComp,
            toPin,
            state: 0
        });
        return true;
    }

    removeWire(index) {
        if (index >= 0 && index < this.wires.length) {
            this.wires.splice(index, 1);
        }
    }

    setFault(componentId, faultType) {
        const comp = this.components.get(componentId);
        if (comp) {
            comp.fault = faultType;
        }
    }

    step() {
        this.clockCycles++;
        
        // Reset inputs for combinatorial evaluation
        for (const comp of this.components.values()) {
            if (comp.type !== 'INPUT') {
                comp.inputs.fill(0);
            }
        }

        // Propagate wire states
        for (const wire of this.wires) {
            const sourceComp = this.components.get(wire.fromComp);
            if (sourceComp) {
                wire.state = sourceComp.state;
                const targetComp = this.components.get(wire.toComp);
                if (targetComp && wire.toPin < targetComp.inputs.length) {
                    targetComp.inputs[wire.toPin] = wire.state;
                }
            }
        }

        // Compute component states
        for (const comp of this.components.values()) {
            let computedState = 0;
            switch (comp.type) {
                case 'INPUT':
                    computedState = comp.state;
                    break;
                case 'OUTPUT':
                    computedState = comp.inputs[0];
                    break;
                case 'NOT':
                    computedState = comp.inputs[0] === 1 ? 0 : 1;
                    break;
                case 'AND':
                    computedState = (comp.inputs[0] === 1 && comp.inputs[1] === 1) ? 1 : 0;
                    break;
                case 'OR':
                    computedState = (comp.inputs[0] === 1 || comp.inputs[1] === 1) ? 1 : 0;
                    break;
                case 'NAND':
                    computedState = (comp.inputs[0] === 1 && comp.inputs[1] === 1) ? 0 : 1;
                    break;
                case 'NOR':
                    computedState = (comp.inputs[0] === 1 || comp.inputs[1] === 1) ? 0 : 1;
                    break;
                case 'XOR':
                    computedState = (comp.inputs[0] !== comp.inputs[1]) ? 1 : 0;
                    break;
                case 'FLIP_FLOP':
                    // Simple D flip-flop on rising edge model
                    const d = comp.inputs[0];
                    const clk = comp.inputs[1];
                    if (comp.prevClk === 0 && clk === 1) {
                        comp.state = d;
                    }
                    comp.prevClk = clk;
                    computedState = comp.state;
                    break;
            }

            // Apply fault injection models
            if (comp.fault === 'SA0') {
                computedState = 0;
            } else if (comp.fault === 'SA1') {
                computedState = 1;
            }

            comp.state = computedState;
        }
    }

    exportJSON() {
        const data = {
            version: '1.3.0',
            components: Array.from(this.components.values()),
            wires: this.wires,
            nextId: this.nextId
        };
        return JSON.stringify(data, null, 2);
    }

    importJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            this.components.clear();
            this.wires = [];
            this.nextId = data.nextId || 1;
            this.clockCycles = 0;

            if (Array.isArray(data.components)) {
                for (const c of data.components) {
                    this.components.set(c.id, {
                        ...c,
                        inputs: c.inputs || [0, 0],
                        inputSources: c.inputSources || [null, null],
                        fault: c.fault || 'NONE'
                    });
                }
            }

            if (Array.isArray(data.wires)) {
                this.wires = data.wires;
            }
            return true;
        } catch (e) {
            console.error('Failed to import circuit JSON:', e);
            return false;
        }
    }
}