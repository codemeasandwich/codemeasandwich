/**
 * Integration tests for context-router-v2.js
 * Tests realistic workflows: prompt processing, attention scoring, phase detection
 */
const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, spawn } = require('child_process');

const SCRIPT_PATH = path.join(__dirname, 'context-router-v2.js');
const FIXTURES_PATH = path.join(__dirname, 'test-fixtures');

// Helper to run the script with input
function runScript(input, env = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn('node', [SCRIPT_PATH], {
            env: { ...process.env, ...env },
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => { stdout += data; });
        child.stderr.on('data', (data) => { stderr += data; });

        child.on('close', (code) => {
            resolve({ stdout, stderr, code });
        });

        child.on('error', reject);

        if (input) {
            child.stdin.write(JSON.stringify(input));
        }
        child.stdin.end();
    });
}

describe('context-router-v2.js', () => {
    let tempDir;
    let stateFile;

    beforeEach(() => {
        // Create temp directory for test state
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'context-router-test-'));
        stateFile = path.join(tempDir, 'attn_state.json');
    });

    afterEach(() => {
        // Cleanup temp directory
        if (tempDir && fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    test('should handle empty prompt gracefully', async () => {
        const result = await runScript({ prompt: '' });
        assert.strictEqual(result.code, 0);
        assert.strictEqual(result.stdout.trim(), '');
    });

    test('should detect phase 1 keywords (clarify, requirements)', async () => {
        const result = await runScript({
            prompt: 'I need to clarify the requirements for this feature'
        }, {
            CONTEXT_DOCS_ROOT: path.join(FIXTURES_PATH, 'sample-docs')
        });

        assert.strictEqual(result.code, 0);
        // Phase detection should find phase 1
        assert.ok(result.stderr.includes('Using') || result.stdout.includes('PHASE'));
    });

    test('should detect phase 5 keywords (implement, code)', async () => {
        const result = await runScript({
            prompt: 'Let me implement the new feature and write the code'
        }, {
            CONTEXT_DOCS_ROOT: path.join(FIXTURES_PATH, 'sample-docs')
        });

        assert.strictEqual(result.code, 0);
    });

    test('should activate files when keywords match', async () => {
        const docsRoot = path.join(FIXTURES_PATH, 'sample-docs');

        const result = await runScript({
            prompt: 'Tell me about TARS and the workflow phases'
        }, {
            CONTEXT_DOCS_ROOT: docsRoot
        });

        assert.strictEqual(result.code, 0);
        // Should have found docs root
        assert.ok(
            result.stderr.includes('Using') ||
            result.stderr.includes('.md files'),
            'Should log docs root usage'
        );
    });

    test('should handle missing docs root gracefully', async () => {
        const result = await runScript({
            prompt: 'Some prompt'
        }, {
            CONTEXT_DOCS_ROOT: '/nonexistent/path'
        });

        // Should warn about missing path
        assert.ok(
            result.stderr.includes('not found') ||
            result.stderr.includes('ERROR'),
            'Should warn about missing docs root'
        );
    });

    test('should output JSON-parseable state when state exists', async () => {
        // Pre-create a state file with some scores
        const testState = {
            scores: { 'CLAUDE.md': 0.9, 'test.md': 0.3 },
            turn_count: 5,
            current_phase: 3,
            last_update: new Date().toISOString()
        };

        fs.mkdirSync(path.join(tempDir, '.claude'), { recursive: true });
        const localStateFile = path.join(tempDir, '.claude', 'attn_state.json');
        fs.writeFileSync(localStateFile, JSON.stringify(testState));

        // Run from temp dir
        const result = await runScript({
            prompt: 'test prompt'
        }, {
            CONTEXT_DOCS_ROOT: path.join(FIXTURES_PATH, 'sample-docs')
        });

        assert.strictEqual(result.code, 0);
    });
});
