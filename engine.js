export class SimulatorEngine {
    constructor() {
        this.components = new Map();
        this.wires = [];
        this.time = 0;
        this.eventIdCounter = 0;
        this.eventQueue = [];
        this.nextComponentId = 1;
    }

    reset() {
        this.components.clear();
        this.wires = [];
        this.time = 0;
        this.eventQueue = [];
        this.nextComponentId = 1;
    }

    addComponent(type, x, y, label = '') {
        const id = `comp_${this.nextComponentId++}`;
        let comp = {
            id,
            type,
            x,
            y,
            inputs: [],
            outputs: [],
            state: 0,
            fault: null, // 'SA0', 'SA1', or null
            delay: 1,
            label
        };

        if (type === 'AND' || type === 'OR' || type === 'XOR' || type === 'NAND' || type === 'NOR') {
            comp.inputs = [0, 0];
            comp.outputs = [0];
        } else if (type === 'NOT') {
            comp.inputs = [0];
            comp.outputs = [0];
        } else if (type === 'SOURCE') {
            comp.inputs = [];
            comp.outputs = [0];
            comp.state = 0;
        } else if (type === 'PROBE') {
            comp.inputs = [0];
            comp.outputs = [];
        }

        this.components.set(id, comp);
        return comp;
    }

    removeComponent(id) {
        this.components.delete(id);
        this.wires = this.wires.filter(w => w.from.comp !== id && w.to.comp !== id);
    }

    addWire(fromCompId, fromPin, toCompId, toPin) {
        const wire = {
            id: `wire_${Math.random().toString(36).substr(2, 9)}`,
            from: { comp: fromCompId, pin: fromPin },
            to: { comp: toCompId, pin: toPin },
            state: 0
        };
        this.wires.push(wire);
        return wire;
    }

    removeWire(wireId) {
        this.wires = this.wires.filter(w => w.id !== wireId);
    }

    scheduleEvent(delay, compId, pinIndex, value) {
        const executeTime = this.time + delay;
        const event = {
            id: this.eventIdCounter++,
            time: executeTime,
            compId,
            pinIndex,
            value
        };
        this.eventQueue.push(event);
        this.eventQueue.sort((a, b) => a.time - b.time);
    }

    step() {
        // Process all events scheduled for current time
        while (this.eventQueue.length > 0 && this.eventQueue[0].time === this.time) {
            const event = this.eventQueue.shift();
            const comp = this.components.get(event.compId);
            if (comp) {
                comp.inputs[event.pinIndex] = event.value;
                this.evaluateComponent(comp);
            }
        }

        // Propagate outputs along wires
        for (const wire of this.wires) {
            const sourceComp = this.components.get(wire.from.comp);
            if (sourceComp) {
                let val = sourceComp.outputs[wire.from.pin];
                wire.state = val;
                const targetComp = this.components.get(wire.to.comp);
                if (targetComp && targetComp.inputs[wire.to.pin] !== val) {
                    this.scheduleEvent(targetComp.delay, wire.to.comp, wire.to.pin, val);
                }
            }
        }

        this.time += 1;
    }

    evaluateComponent(comp) {
        let res = 0;
        const [i0, i1] = comp.inputs;

        switch (comp.type) {
            case 'SOURCE':
                res = comp.state;
                break;
            case 'AND':
                res = (i0 & i1) & 1;
                break;
            case 'OR':
                res = (i0 | i1) & 1;
                break;
            case 'XOR':
                res = (i0 ^ i1) & 1;
                break;
            case 'NAND':
                res = (!(i0 & i1)) ? 1 : 0;
                break;
            case 'NOR':
                res = (!(i0 | i1)) ? 1 : 0;
                break;
            case 'NOT':
                res = (!i0) ? 1 : 0;
                break;
            case 'PROBE':
                comp.state = i0;
                return;
        }

        // Apply fault injection
        if (comp.fault === 'SA0') {
            res = 0;
        } else if (comp.fault === 'SA1') {
            res = 1;
        }

        if (comp.outputs.length > 0) {
            comp.outputs[0] = res;
        }
        comp.state = res;
    }

    exportJson() {
        const data = {
            time: this.time,
            components: Array.from(this.components.entries()),
            wires: this.wires
        };
        return JSON.stringify(data, null, 2);
    }

    importJson(jsonStr) {
        const data = JSON.parse(jsonStr);
        this.time = data.time;
        this.components = new Map(data.components);
        this.wires = data.wires;
    }
}
