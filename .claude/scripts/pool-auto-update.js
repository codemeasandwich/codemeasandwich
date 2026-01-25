#!/usr/bin/env node
/**
 * Pool Auto-Updater - UserPromptSubmit Hook
 * Continuously writes pool updates during long-running sessions.
 *
 * Unlike pool-extractor.js (Stop hook, session-end only), this runs on EVERY
 * user prompt and extracts coordination signals from the conversation flow.
 *
 * Works with persistent sessions (days/weeks long) by detecting:
 * - Task completions in previous assistant responses
 * - Explicit pool blocks (same as extractor)
 * - Implicit coordination signals (heuristic detection)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

// Pool file location (project-local preferred, global fallback)
const PROJECT_POOL = path.join('.claude', 'pool', 'instance_state.jsonl');
const GLOBAL_POOL = path.join(os.homedir(), '.claude', 'pool', 'instance_state.jsonl');

function getPoolFile() {
    /** Get pool file (project-local first, global fallback). */
    const projectPoolParentParent = path.dirname(path.dirname(PROJECT_POOL));
    if (fs.existsSync(projectPoolParentParent)) {
        const projectPoolDir = path.dirname(PROJECT_POOL);
        fs.mkdirSync(projectPoolDir, { recursive: true });
        return PROJECT_POOL;
    }
    const globalPoolDir = path.dirname(GLOBAL_POOL);
    fs.mkdirSync(globalPoolDir, { recursive: true });
    return GLOBAL_POOL;
}

const POOL_FILE = getPoolFile();
const SESSION_ENV = process.env.CLAUDE_SESSION_ENV || '';
const COOLDOWN_FILE = SESSION_ENV ? path.join(SESSION_ENV, 'last_pool_update.txt') : null;

// Minimum time between auto-updates (prevent spam)
const COOLDOWN_SECONDS = 300;  // 5 minutes

// === Explicit Pool Block Detection (same as extractor) ===

function extractPoolBlock(text) {
    /** Extract explicit ```pool blocks. */
    const pattern = /```pool\n(.*?)```/s;
    const match = text.match(pattern);
    if (match) {
        return parsePoolBlock(match[1]);
    }
    return null;
}

function parsePoolBlock(block) {
    /** Parse pool block fields. */
    const data = {};
    for (const line of block.trim().split('\n')) {
        if (line.includes(':')) {
            const colonIndex = line.indexOf(':');
            const key = line.substring(0, colonIndex).trim().toLowerCase();
            const value = line.substring(colonIndex + 1).trim();
            data[key] = value;
        }
    }
    return data;
}

// === Implicit Signal Detection (heuristic) ===

function detectImplicitSignals(text) {
    /**
     * Detect coordination-worthy events from conversation flow.
     * Returns [action, topic, summary] or null.
     */
    const textLower = text.toLowerCase();

    // Completion signals
    const completionPatterns = [
        [/(fixed|resolved|completed|deployed|merged|pushed)\s+([^.!?\n]{10,80})/i, 'completed'],
        [/(successfully|✓|✅)\s+([^.!?\n]{10,80})/i, 'completed'],
        [/(implementation|fix|feature)\s+(done|complete|finished)/i, 'completed'],
    ];

    // Blocker signals
    const blockerPatterns = [
        [/(blocked by|cannot|unable to|waiting for)\s+([^.!?\n]{10,80})/i, 'blocked'],
        [/(error|failure|crash|bug)\s+in\s+([^.!?\n]{10,80})/i, 'blocked'],
    ];

    // Signaling patterns
    const signalPatterns = [
        [/(discovered|found|noticed)\s+([^.!?\n]{10,80})/i, 'signaling'],
        [/(warning|note|fyi):\s+([^.!?\n]{10,80})/i, 'signaling'],
    ];

    // Check patterns in order of priority
    const allPatternGroups = [
        [completionPatterns, 'completed'],
        [blockerPatterns, 'blocked'],
        [signalPatterns, 'signaling'],
    ];

    for (const [patterns] of allPatternGroups) {
        for (const [pattern, detectedAction] of patterns) {
            const match = textLower.match(pattern);
            if (match) {
                let topic = match[2].trim();
                // Clean up topic
                topic = topic.replace(/\s+/g, ' ');
                topic = topic.substring(0, 60);

                // Extract summary (sentence containing the match)
                const sentences = text.split(/[.!?]\s+/);
                for (const sentence of sentences) {
                    if (sentence.toLowerCase().includes(topic.toLowerCase())) {
                        const summary = sentence.trim().substring(0, 200);
                        return [detectedAction, topic, summary];
                    }
                }
            }
        }
    }

    return null;
}

// === Relevance Scoring (same as extractor) ===

function computeRelevance(topic, summary, affects) {
    /** Score relevance to each instance domain. */
    const domains = {
        "A": ["pipeline", "orchestration", "routing", "dispatch", "coordination", "integration"],
        "B": ["visual", "image", "clip", "llava", "sdxl", "asus", "perception", "generation"],
        "C": ["inference", "oracle", "transformer", "orin", "model", "cvmp", "consciousness"],
        "D": ["edge", "hailo", "jetson", "npu", "embedded", "pi5", "hmcp", "physical"]
    };

    const relevance = {};
    const combinedText = `${topic} ${summary} ${affects}`.toLowerCase();

    for (const [instance, keywords] of Object.entries(domains)) {
        const matches = keywords.filter(kw => combinedText.includes(kw)).length;
        const score = Math.min(matches / keywords.length * 2, 1.0);
        relevance[instance] = Math.round(score * 100) / 100;
    }

    return relevance;
}

// === Pool Entry Writing ===

function writePoolEntry(action, topic, summary, affects = '', blocks = '') {
    /** Write entry to pool. */
    const instanceId = process.env.CLAUDE_INSTANCE ?? '?';

    const entry = {
        id: crypto.randomUUID(),
        timestamp: Math.floor(Date.now() / 1000),
        source_instance: instanceId,
        session_id: (process.env.CLAUDE_SESSION_ID ?? 'unknown').substring(0, 8),
        action: action,
        topic: topic.substring(0, 60),
        summary: summary.substring(0, 200),
        relevance: computeRelevance(topic, summary, affects),
        affects: affects,
        blocks: blocks,
        ttl: 3600,
        raw_hash: crypto.createHash('sha256').update(`${topic}${summary}`).digest('hex').substring(0, 16)
    };

    // Append to pool
    const poolDir = path.dirname(POOL_FILE);
    fs.mkdirSync(poolDir, { recursive: true });
    fs.appendFileSync(POOL_FILE, JSON.stringify(entry) + '\n');

    return entry;
}

// === Cooldown Management ===

function checkCooldown() {
    /** Check if enough time has passed since last auto-update. */
    if (!COOLDOWN_FILE || !fs.existsSync(COOLDOWN_FILE)) {
        return true;
    }

    try {
        const lastUpdate = parseFloat(fs.readFileSync(COOLDOWN_FILE, 'utf8').trim());
        return (Date.now() / 1000 - lastUpdate) > COOLDOWN_SECONDS;
    } catch {
        return true;
    }
}

function updateCooldown() {
    /** Record time of this update. */
    if (COOLDOWN_FILE) {
        fs.writeFileSync(COOLDOWN_FILE, String(Date.now() / 1000));
    }
}

// === Main Logic ===

function getLastAssistantResponse() {
    /** Get last assistant message from current session. */
    if (!SESSION_ENV) {
        return '';
    }

    const transcript = path.join(SESSION_ENV, 'transcript.jsonl');
    if (!fs.existsSync(transcript)) {
        return '';
    }

    try {
        const lines = fs.readFileSync(transcript, 'utf8').split('\n').filter(line => line.trim());

        // Find last assistant message
        for (let i = lines.length - 1; i >= 0; i--) {
            try {
                const entry = JSON.parse(lines[i]);
                if (entry.type === 'assistant' || entry.role === 'assistant') {
                    let content = entry.message?.content || [];
                    if (!content.length) {
                        content = entry.content || [];
                    }

                    const textParts = [];
                    for (const block of content) {
                        if (typeof block === 'object' && block.type === 'text') {
                            textParts.push(block.text || '');
                        } else if (typeof block === 'string') {
                            textParts.push(block);
                        }
                    }

                    return textParts.join('\n');
                }
            } catch {
                continue;
            }
        }
    } catch {
        // Silent fail
    }

    return '';
}

function main() {
    /** Main entry point. */
    // Get last assistant response
    const lastResponse = getLastAssistantResponse();
    if (!lastResponse) {
        return;
    }

    // Check for explicit pool block first (takes priority)
    const explicit = extractPoolBlock(lastResponse);
    if (explicit) {
        writePoolEntry(
            explicit.action ?? 'signaling',
            explicit.topic ?? 'Pool update',
            explicit.summary ?? '',
            explicit.affects ?? '',
            explicit.blocks ?? ''
        );
        updateCooldown();
        return;
    }

    // Check cooldown before implicit detection (prevent spam)
    if (!checkCooldown()) {
        return;
    }

    // Try implicit signal detection
    const implicit = detectImplicitSignals(lastResponse);
    if (implicit) {
        const [action, topic, summary] = implicit;
        writePoolEntry(
            action,
            topic,
            summary,
            'auto-detected',
            ''
        );
        updateCooldown();
    }
}

// Run main
try {
    main();
} catch (e) {
    // Silent fail - don't block conversation
    const errorLog = path.join(os.homedir(), '.claude', 'pool', 'auto_update_errors.log');
    try {
        fs.appendFileSync(errorLog, `[${new Date().toISOString()}] ${e}\n`);
    } catch {
        // Ignore error logging failures
    }
}
