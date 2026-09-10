import { SimulatorEngine } from './engine.js';

export class TestSuite {
    constructor() {
        this.results = [];
    }

    assert(condition, message) {
        if (!condition) {
            throw new Error(`Assertion Failed: ${message}`);
        }
    }

    runTests() {
        this.results = [];
        const tests = [
            () => this.testGateTruthTables(),
            () => this.testWirePropagation(),
            () => this.testFaultInjection(),
            () => this.testUndoRedo(),
            () => this.testJSONSerialization()
        ];

        let passed = 0;
        let failed = 0;

        for (const test of tests) {
            const name = test.name || 'Anonymous Test';
            try {
                test.call(this);
                this.results.push({ name, status: 'PASS' });
                passed++;
            } catch (err) {
                this.results.push({ name, status: 'FAIL', error: err.message });
                failed++;
            }
        }

        return { passed, failed, results: this.results };
    }

    runBenchmarks() {
        const engine = new SimulatorEngine();
        const inputId = engine.addComponent('INPUT', 50, 50);
        const notId = engine.addComponent('NOT', 150, 50);
        const andId = engine.addComponent('AND', 250, 50);
        const outputId = engine.addComponent('OUTPUT', 350, 50);

        engine.addWire(inputId, 0, notId, 0);
        engine.addWire(notId, 0, andId, 0);
        engine.addWire(inputId, 0, andId, 1);
        engine.addWire(andId, 0, outputId, 0);

        const iterations = 10000;
        const startTime = performance.now();

        for (let i = 0; i < iterations; i++) {
            const inp = engine.components.get(inputId);
            inp.inputs[0] = (i % 2 === 0);
            engine.step();
        }

        const endTime = performance.now();
        const duration = endTime - startTime;

        return {
            iterations,
            durationMs: duration.toFixed(2),
            ticksPerSec: Math.round((iterations / duration) * 1000)
        };
    }

    testGateTruthTables() {
        const engine = new SimulatorEngine();
        
        // Test AND Gate
        const andId = engine.addComponent('AND', 0, 0);
        const andComp = engine.components.get(andId);
        andComp.inputs = [false, false];
        engine.step();
        this.assert(andComp.output === false, 'AND 0,0 should be false');

        andComp.inputs = [true, true];
        engine.step();
        this.assert(andComp.output === true, 'AND 1,1 should be true');

        // Test OR Gate
        const orId = engine.addComponent('OR', 0, 0);
        const orComp = engine.components.get(orId);
        orComp.inputs = [false, false];
        engine.step();
        this.assert(orComp.output === false, 'OR 0,0 should be false');

        orComp.inputs = [true, false];
        engine.step();
        this.assert(orComp.output === true, 'OR 1,0 should be true');

        // Test NOT Gate
        const notId = engine.addComponent('NOT', 0, 0);
        const notComp = engine.components.get(notId);
        notComp.inputs = [true];
        engine.step();
        this.assert(notComp.output === false, 'NOT 1 should be false');
    }

    testWirePropagation() {
        const engine = new SimulatorEngine();
        const inId = engine.addComponent('INPUT', 0, 0);
        const outId = engine.addComponent('OUTPUT', 100, 0);

        engine.addWire(inId, 0, outId, 0);
        
        engine.components.get(inId).inputs[0] = true;
        engine.step();

        const outComp = engine.components.get(outId);
        this.assert(outComp.inputs[0] === true, 'Wire should propagate signal to output component');
    }

    testFaultInjection() {
        const engine = new SimulatorEngine();
        const andId = engine.addComponent('AND', 0, 0);
        const andComp = engine.components.get(andId);
        
        andComp.inputs = [true, true];
        andComp.fault = { type: 'SA0' };
        engine.step();

        this.assert(andComp.output === false, 'Stuck-at-0 fault should force output to false');

        andComp.fault = { type: 'SA1' };
        engine.step();

        this.assert(andComp.output === true, 'Stuck-at-1 fault should force output to true');
    }

    testUndoRedo() {
        const engine = new SimulatorEngine();
        const inId = engine.addComponent('INPUT', 0, 0);
        this.assert(engine.components.size === 1, 'Component should be added');

        engine.removeComponent(inId);
        this.assert(engine.components.size === 0, 'Component should be removed');

        engine.undo();
        this.assert(engine.components.size === 1, 'Undo should restore removed component');
    }

    testJSONSerialization() {
        const engine = new SimulatorEngine();
        engine.addComponent('AND', 10, 20);
        const json = engine.exportJSON();

        const engine2 = new SimulatorEngine();
        const success = engine2.importJSON(json);

        this.assert(success, 'JSON import should succeed');
        this.assert(engine2.components.size === 1, 'Imported engine should have 1 component');
    }
}
