export class SimulatorEngine {
    constructor() {
        this.components = new Map();
        this.wires = [];
        this.nextId = 1;
    }
    addComponent(type, x, y) {
        try {
            const id = `comp_${this.nextId++}`;
            this.components.set(id, { type, x, y, state: 0 });
            return id;
        } catch (e) {
            console.error('Failed to instantiate component:', e);
            return null;
        }
    }
    serialize() {
        return {
            components: Array.from(this.components.entries()),
            wires: this.wires
        };
    }
}