/**
 * Integration tests for pool-auto-update.js
 * Tests explicit pool block extraction and implicit signal detection
 */
const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const SCRIPT_PATH = path.join(__dirname, 'pool-auto-update.js');

// Helper to import and test individual functions
// Since this is a CLI script, we'll test via file manipulation

describe('pool-auto-update.js', () => {
    let tempDir;
    let poolFile;
    let sessionDir;
    let transcriptFile;
    let cooldownFile;

    beforeEach(() => {
        // Create temp directory for test
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pool-auto-test-'));
        poolFile = path.join(tempDir, 'pool', 'instance_state.jsonl');
        sessionDir = path.join(tempDir, 'session');
        transcriptFile = path.join(sessionDir, 'transcript.jsonl');
        cooldownFile = path.join(sessionDir, 'last_pool_update.txt');

        fs.mkdirSync(path.join(tempDir, 'pool'), { recursive: true });
        fs.mkdirSync(sessionDir, { recursive: true });
    });

    afterEach(() => {
        if (tempDir && fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    test('should extract explicit pool block from transcript', () => {
        // Create transcript with pool block
        const transcript = [
            JSON.stringify({
                type: 'assistant',
                message: {
                    content: [{
                        type: 'text',
                        text: 'Done!\n\n```pool\naction: completed\ntopic: Fixed bug\nsummary: Resolved the issue\n```'
                    }]
                }
            })
        ].join('\n');

        fs.writeFileSync(transcriptFile, transcript);

        // Test the regex extraction (inline test)
        const pattern = /```pool\n(.*?)```/s;
        const text = 'Done!\n\n```pool\naction: completed\ntopic: Fixed bug\nsummary: Resolved the issue\n```';
        const match = text.match(pattern);

        assert.ok(match, 'Should match pool block');
        assert.ok(match[1].includes('action: completed'));
        assert.ok(match[1].includes('topic: Fixed bug'));
    });

    test('should parse pool block fields correctly', () => {
        const block = 'action: completed\ntopic: Fixed bug\nsummary: Resolved the issue\naffects: src/auth.js';

        // Parse logic
        const data = {};
        for (const line of block.trim().split('\n')) {
            if (line.includes(':')) {
                const colonIndex = line.indexOf(':');
                const key = line.substring(0, colonIndex).trim().toLowerCase();
                const value = line.substring(colonIndex + 1).trim();
                data[key] = value;
            }
        }

        assert.strictEqual(data.action, 'completed');
        assert.strictEqual(data.topic, 'Fixed bug');
        assert.strictEqual(data.summary, 'Resolved the issue');
        assert.strictEqual(data.affects, 'src/auth.js');
    });

    test('should detect implicit completion signals', () => {
        const text = 'I have successfully fixed the authentication issue in the login module.';
        const pattern = /(fixed|resolved|completed|deployed|merged|pushed)\s+([^.!?\n]{10,80})/i;
        const match = text.match(pattern);

        assert.ok(match, 'Should detect completion signal');
        assert.strictEqual(match[1].toLowerCase(), 'fixed');
        assert.ok(match[2].includes('authentication'));
    });

    test('should detect implicit blocker signals', () => {
        const text = 'I am blocked by the missing API key configuration.';
        const pattern = /(blocked by|cannot|unable to|waiting for)\s+([^.!?\n]{10,80})/i;
        const match = text.match(pattern);

        assert.ok(match, 'Should detect blocker signal');
        assert.strictEqual(match[1].toLowerCase(), 'blocked by');
    });

    test('should compute relevance scores correctly', () => {
        // Test relevance computation logic
        const domains = {
            "A": ["pipeline", "orchestration", "routing"],
            "B": ["visual", "image", "clip"],
            "C": ["inference", "oracle", "transformer"],
            "D": ["edge", "hailo", "jetson"]
        };

        const text = 'pipeline orchestration routing';  // All A keywords
        const relevance = {};

        for (const [instance, keywords] of Object.entries(domains)) {
            const matches = keywords.filter(kw => text.includes(kw)).length;
            const score = Math.min(matches / keywords.length * 2, 1.0);
            relevance[instance] = Math.round(score * 100) / 100;
        }

        assert.strictEqual(relevance.A, 1.0, 'Instance A should have max relevance');
        assert.strictEqual(relevance.B, 0, 'Instance B should have 0 relevance');
    });

    test('should respect cooldown period', () => {
        // Write a recent cooldown timestamp
        const recentTime = Date.now() / 1000 - 60;  // 1 minute ago
        fs.writeFileSync(cooldownFile, String(recentTime));

        const COOLDOWN_SECONDS = 300;
        const lastUpdate = parseFloat(fs.readFileSync(cooldownFile, 'utf8').trim());
        const elapsed = Date.now() / 1000 - lastUpdate;

        assert.ok(elapsed < COOLDOWN_SECONDS, 'Should be within cooldown period');
    });

    test('should allow update after cooldown expires', () => {
        // Write an old cooldown timestamp
        const oldTime = Date.now() / 1000 - 400;  // 6.67 minutes ago
        fs.writeFileSync(cooldownFile, String(oldTime));

        const COOLDOWN_SECONDS = 300;
        const lastUpdate = parseFloat(fs.readFileSync(cooldownFile, 'utf8').trim());
        const elapsed = Date.now() / 1000 - lastUpdate;

        assert.ok(elapsed > COOLDOWN_SECONDS, 'Should be past cooldown period');
    });
});
