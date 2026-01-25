#!/usr/bin/env node
/**
 * Pool Extractor - Stop Hook
 * Extracts ```pool blocks from assistant responses and writes to instance pool.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

// Pool file location (project-local preferred, global fallback)
const PROJECT_POOL = path.join('.claude', 'pool', 'instance_state.jsonl');
const GLOBAL_POOL = path.join(os.homedir(), '.claude', 'pool', 'instance_state.jsonl');

function getPoolFile() {
    /**Get pool file (project-local first, global fallback).*/
    const projectClaudeDir = path.dirname(path.dirname(PROJECT_POOL));
    if (fs.existsSync(projectClaudeDir)) {  // Check if .claude/ exists
        const projectPoolDir = path.dirname(PROJECT_POOL);
        fs.mkdirSync(projectPoolDir, { recursive: true });
        return PROJECT_POOL;
    }
    const globalPoolDir = path.dirname(GLOBAL_POOL);
    fs.mkdirSync(globalPoolDir, { recursive: true });
    return GLOBAL_POOL;
}

const POOL_FILE = getPoolFile();
const ACTIVE_INSTANCES = path.join(path.dirname(POOL_FILE), 'active_instances.json');

function extractPoolBlock(text) {
    /**Extract structured pool update from response.*/
    const pattern = /```pool\n(.*?)```/s;
    const match = text.match(pattern);
    if (match) {
        return parsePoolBlock(match[1]);
    }
    return null;
}

function parsePoolBlock(block) {
    /**Parse pool block into structured data.*/
    const data = {};
    for (const line of block.trim().split('\n')) {
        if (line.includes(':')) {
            const colonIndex = line.indexOf(':');
            const key = line.slice(0, colonIndex).trim().toLowerCase();
            const value = line.slice(colonIndex + 1).trim();
            data[key] = value;
        }
    }
    return data;
}

function getLastAssistantResponse(transcriptPath) {
    /**Get last assistant message from transcript.*/
    if (!fs.existsSync(transcriptPath)) {
        return "";
    }

    const content = fs.readFileSync(transcriptPath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());

    // Look for last assistant message
    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        try {
            const entry = JSON.parse(line);
            if (entry.type === "assistant" || entry.role === "assistant") {
                // Handle both formats
                let entryContent = entry.message?.content ?? [];
                if (!entryContent.length) {
                    entryContent = entry.content ?? [];
                }

                // Extract text from content blocks
                const textParts = [];
                for (const block of entryContent) {
                    if (typeof block === 'object' && block !== null) {
                        if (block.type === "text") {
                            textParts.push(block.text ?? "");
                        } else if ("text" in block) {
                            textParts.push(block.text);
                        }
                    } else if (typeof block === 'string') {
                        textParts.push(block);
                    }
                }

                const result = textParts.join("\n");
                if (result) {
                    return result;
                }
            }
        } catch (e) {
            continue;
        }
    }

    return "";
}

function nemotronSummarize(text, maxTokens = 50) {
    /**Compress via Nemotron (fallback to truncation).*/
    if (text.length <= 200) {
        return text;
    }

    // Smart truncation - try to keep complete sentences
    const truncated = text.slice(0, 200);
    const lastPeriod = truncated.lastIndexOf('.');
    if (lastPeriod > 100) {
        return truncated.slice(0, lastPeriod + 1);
    } else {
        return truncated + "...";
    }
}

function computeRelevance(topic, summary, affects) {
    /**Score relevance to each instance domain.*/
    const domains = {
        "A": ["pipeline", "orchestration", "routing", "dispatch", "coordination", "integration"],
        "B": ["visual", "image", "clip", "llava", "sdxl", "asus", "perception", "generation"],
        "C": ["inference", "oracle", "transformer", "orin", "model", "cvmp", "consciousness"],
        "D": ["edge", "hailo", "jetson", "npu", "embedded", "pi5", "hmcp", "physical"]
    };

    const relevance = {};
    const text = `${topic} ${summary} ${affects}`.toLowerCase();

    for (const [instance, keywords] of Object.entries(domains)) {
        const matches = keywords.filter(kw => text.includes(kw)).length;
        const score = Math.min(matches / keywords.length * 2, 1.0);
        relevance[instance] = Math.round(score * 100) / 100;
    }

    return relevance;
}

function getInstanceId() {
    /**Get current instance ID from env or active registration.*/
    const instanceId = process.env.CLAUDE_INSTANCE;
    if (instanceId) {
        return instanceId;
    }
    return "?";
}

function writePoolEntry(entry) {
    /**Append entry to pool.*/
    const poolDir = path.dirname(POOL_FILE);
    fs.mkdirSync(poolDir, { recursive: true });
    fs.appendFileSync(POOL_FILE, JSON.stringify(entry) + "\n");
}

function main() {
    try {
        // Read hook input
        const inputData = JSON.parse(fs.readFileSync(0, 'utf8'));
        const transcriptPath = inputData.transcript_path;
        const sessionId = inputData.session_id ?? "unknown";

        if (!transcriptPath) {
            console.log(JSON.stringify({ suppressOutput: true }));
            process.exit(0);
        }

        // Get last assistant response
        const response = getLastAssistantResponse(transcriptPath);
        if (!response) {
            console.log(JSON.stringify({ suppressOutput: true }));
            process.exit(0);
        }

        // Extract pool data
        const poolData = extractPoolBlock(response);
        if (!poolData) {
            console.log(JSON.stringify({ suppressOutput: true }));
            process.exit(0);
        }

        // Build entry
        let summary = poolData.summary ?? "";
        if (summary.length > 200) {
            summary = nemotronSummarize(summary);
        }

        const topic = poolData.topic ?? "unknown";
        const affects = poolData.affects ?? "";

        const entry = {
            id: crypto.randomUUID(),
            timestamp: Math.floor(Date.now() / 1000),
            source_instance: getInstanceId(),
            session_id: sessionId.slice(0, 8),
            action: poolData.action ?? "signaling",
            topic: topic,
            summary: summary,
            relevance: computeRelevance(topic, summary, affects),
            affects: affects,
            blocks: poolData.blocks ?? "",
            ttl: 3600,
            raw_hash: crypto.createHash('sha256').update(response).digest('hex').slice(0, 16)
        };

        // Write to pool
        writePoolEntry(entry);

        // Suppress output
        console.log(JSON.stringify({ suppressOutput: true }));

    } catch (e) {
        // Fail gracefully
        const errorLogPath = path.join(os.homedir(), '.claude', 'pool', 'extractor_errors.log');
        const errorLogDir = path.dirname(errorLogPath);
        fs.mkdirSync(errorLogDir, { recursive: true });
        const timestamp = new Date().toISOString();
        fs.appendFileSync(errorLogPath, `${timestamp}: ${e.message}\n${e.stack}\n`);
        console.log(JSON.stringify({ suppressOutput: true }));
    }

    process.exit(0);
}

main();
