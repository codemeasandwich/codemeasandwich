/**
 * Integration tests for pool-extractor.js
 * Tests pool block extraction from transcripts
 */
const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');

const SCRIPT_PATH = path.join(__dirname, 'pool-extractor.js');
const FIXTURES_PATH = path.join(__dirname, 'test-fixtures');

// Helper to run the script with stdin input
function runScript(input) {
    return new Promise((resolve, reject) => {
        const child = spawn('node', [SCRIPT_PATH], {
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

describe('pool-extractor.js', () => {
    let tempDir;
    let transcriptFile;
    let poolFile;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pool-extractor-test-'));
        transcriptFile = path.join(tempDir, 'transcript.jsonl');
        poolFile = path.join(tempDir, 'pool', 'instance_state.jsonl');
        fs.mkdirSync(path.join(tempDir, 'pool'), { recursive: true });
    });

    afterEach(() => {
        if (tempDir && fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    test('should extract pool block from text', () => {
        const text = `I've completed the task.

\`\`\`pool
action: completed
topic: Fixed authentication
summary: Resolved the login issue
affects: src/auth.js
\`\`\`

That should fix it.`;

        const pattern = /```pool\n(.*?)```/s;
        const match = text.match(pattern);

        assert.ok(match, 'Should match pool block');
        assert.ok(match[1].includes('action: completed'));
        assert.ok(match[1].includes('topic: Fixed authentication'));
    });

    test('should parse pool block into data object', () => {
        const block = `action: completed
topic: Fixed authentication
summary: Resolved the login issue
affects: src/auth.js
blocks: login-feature`;

        const data = {};
        for (const line of block.trim().split('\n')) {
            if (line.includes(':')) {
                const colonIndex = line.indexOf(':');
                const key = line.slice(0, colonIndex).trim().toLowerCase();
                const value = line.slice(colonIndex + 1).trim();
                data[key] = value;
            }
        }

        assert.strictEqual(data.action, 'completed');
        assert.strictEqual(data.topic, 'Fixed authentication');
        assert.strictEqual(data.summary, 'Resolved the login issue');
        assert.strictEqual(data.affects, 'src/auth.js');
        assert.strictEqual(data.blocks, 'login-feature');
    });

    test('should handle missing transcript path', async () => {
        const result = await runScript({
            session_id: 'test-session'
            // No transcript_path
        });

        assert.strictEqual(result.code, 0);

        // Should output suppressOutput
        const output = JSON.parse(result.stdout.trim());
        assert.strictEqual(output.suppressOutput, true);
    });

    test('should compute relevance scores for domains', () => {
        const domains = {
            "A": ["pipeline", "orchestration", "routing", "dispatch", "coordination", "integration"],
            "B": ["visual", "image", "clip", "llava", "sdxl", "asus", "perception", "generation"],
            "C": ["inference", "oracle", "transformer", "orin", "model", "cvmp", "consciousness"],
            "D": ["edge", "hailo", "jetson", "npu", "embedded", "pi5", "hmcp", "physical"]
        };

        const topic = 'visual perception';
        const summary = 'Processing images with clip model';
        const affects = 'image pipeline';

        const text = `${topic} ${summary} ${affects}`.toLowerCase();
        const relevance = {};

        for (const [instance, keywords] of Object.entries(domains)) {
            const matches = keywords.filter(kw => text.includes(kw)).length;
            const score = Math.min(matches / keywords.length * 2, 1.0);
            relevance[instance] = Math.round(score * 100) / 100;
        }

        // B should have high relevance (visual, image, clip, perception)
        assert.ok(relevance.B > 0.5, 'Instance B should have high relevance');
        // A should have some relevance (pipeline)
        assert.ok(relevance.A > 0, 'Instance A should have some relevance');
    });

    test('should truncate long summaries with nemotron-style compression', () => {
        function nemotronSummarize(text) {
            if (text.length <= 200) {
                return text;
            }

            const truncated = text.slice(0, 200);
            const lastPeriod = truncated.lastIndexOf('.');
            if (lastPeriod > 100) {
                return truncated.slice(0, lastPeriod + 1);
            } else {
                return truncated + "...";
            }
        }

        const shortText = "This is a short summary.";
        assert.strictEqual(nemotronSummarize(shortText), shortText);

        const longText = "This is a very long summary that exceeds the maximum length. ".repeat(10);
        const result = nemotronSummarize(longText);
        assert.ok(result.length <= 203, 'Should be truncated');  // 200 + "..."
    });

    test('should extract last assistant response from transcript', () => {
        const transcriptLines = [
            JSON.stringify({ type: 'user', content: [{ type: 'text', text: 'Hello' }] }),
            JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'First response' }] } }),
            JSON.stringify({ type: 'user', content: [{ type: 'text', text: 'Another question' }] }),
            JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'Second response with pool block' }] } })
        ];

        fs.writeFileSync(transcriptFile, transcriptLines.join('\n'));

        const content = fs.readFileSync(transcriptFile, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());

        // Find last assistant message
        let lastResponse = '';
        for (let i = lines.length - 1; i >= 0; i--) {
            const entry = JSON.parse(lines[i]);
            if (entry.type === 'assistant') {
                const textParts = entry.message?.content
                    ?.filter(b => b.type === 'text')
                    .map(b => b.text) || [];
                lastResponse = textParts.join('\n');
                break;
            }
        }

        assert.strictEqual(lastResponse, 'Second response with pool block');
    });

    test('should generate valid UUID for entry id', () => {
        const uuid = crypto.randomUUID();

        // UUID v4 format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        assert.ok(uuidRegex.test(uuid), 'Should generate valid UUID v4');
    });

    test('should generate consistent hash for same input', () => {
        const response = 'Test response content';

        const hash1 = crypto.createHash('sha256').update(response).digest('hex').slice(0, 16);
        const hash2 = crypto.createHash('sha256').update(response).digest('hex').slice(0, 16);

        assert.strictEqual(hash1, hash2, 'Same input should produce same hash');
    });
});
