export class SimulatorEngine {
    constructor() {
        this.components = new Map();
        this.wires = [];
        this.nextId = 1;
        this.isRunning = false;
        this.faultMode = 'NONE'; // 'NONE', 'SA0', 'SA1'
        this.selectedComponentId = null;
    }

    addComponent(type, x, y) {
        try {
            const id = `comp_${this.nextId++}`;
            this.components.set(id, {
                id,
                type,
                x,
                y,
                state: 0,
                fault: 'NONE'
            });
            return id;
        } catch (e) {
            console.error('Failed to instantiate component:', e);
            return null;
        }
    }

    removeComponent(id) {
        if (this.components.has(id)) {
            this.components.delete(id);
            this.wires = this.wires.filter(w => w.from !== id && w.to !== id);
            if (this.selectedComponentId === id) {
                this.selectedComponentId = null;
            }
            return true;
        }
        return false;
    }

    addWire(from, to, fromPin = 0, toPin = 0) {
        if (this.components.has(from) && this.components.has(to)) {
            this.wires.push({ from, to, fromPin, toPin, state: 0 });
            return true;
        }
        return false;
    }

    step() {
        // Evaluate combinational and sequential logic
        for (const [id, comp] of this.components) {
            if (comp.type === 'INPUT') {
                // Inputs retain state or toggle if clicked
                continue;
            }

            // Gather input states
            const incomingWires = this.wires.filter(w => w.to === id);
            const inputStates = incomingWires.map(w => {
                const sourceComp = this.components.get(w.from);
                return sourceComp ? sourceComp.state : 0;
            });

            let newState = 0;
            if (comp.type === 'NOT') {
                newState = inputStates.length > 0 ? (inputStates[0] === 0 ? 1 : 0) : 0;
            } else if (comp.type === 'AND') {
                newState = inputStates.length > 0 && inputStates.every(s => s === 1) ? 1 : 0;
            } else if (comp.type === 'OR') {
                newState = inputStates.some(s => s === 1) ? 1 : 0;
            } else if (comp.type === 'FLIP-FLOP') {
                newState = inputStates.length > 0 ? inputStates[0] : comp.state;
            } else if (comp.type === 'OUTPUT') {
                newState = inputStates.length > 0 ? inputStates[0] : 0;
            }

            // Apply fault injection if active
            if (comp.fault === 'SA0') {
                newState = 0;
            } else if (comp.fault === 'SA1') {
                newState = 1;
            }

            comp.state = newState;
        }

        // Propagate wire states
        for (const wire of this.wires) {
            const sourceComp = this.components.get(wire.from);
            if (sourceComp) {
                wire.state = sourceComp.state;
            }
        }
    }

    injectFault(id, faultType) {
        if (this.components.has(id)) {
            const comp = this.components.get(id);
            comp.fault = faultType;
            return true;
        }
        return false;
    }

    reset() {
        for (const [id, comp] of this.components) {
            comp.state = 0;
            comp.fault = 'NONE';
        }
        for (const wire of this.wires) {
            wire.state = 0;
        }
    }

    validate() {
        for (const wire of this.wires) {
            if (!this.components.has(wire.from) || !this.components.has(wire.to)) {
                return false;
            }
        }
        return true;
    }

    serialize() {
        return {
            components: Array.from(this.components.entries()),
            wires: this.wires,
            nextId: this.nextId
        };
    }

    deserialize(data) {
        try {
            this.components = new Map(data.components);
            this.wires = data.wires || [];
            this.nextId = data.nextId || (this.components.size + 1);
            return true;
        } catch (e) {
            console.error('Failed to deserialize circuit state:', e);
            return false;
        }
    }
}
