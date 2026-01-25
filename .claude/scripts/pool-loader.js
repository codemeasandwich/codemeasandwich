#!/usr/bin/env node
/**
 * Pool Loader - SessionStart Hook
 * Loads recent, relevant pool entries and formats them for context injection.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// Pool file location (project-local preferred, global fallback)
const PROJECT_POOL = path.join('.claude', 'pool', 'instance_state.jsonl');
const GLOBAL_POOL = path.join(os.homedir(), '.claude', 'pool', 'instance_state.jsonl');

function getPoolFile() {
    /** Get pool file (project-local first, global fallback). */
    const projectClaudeDir = path.dirname(path.dirname(PROJECT_POOL));
    if (fs.existsSync(projectClaudeDir)) {
        return fs.existsSync(PROJECT_POOL) ? PROJECT_POOL : GLOBAL_POOL;
    }
    return GLOBAL_POOL;
}

const POOL_FILE = getPoolFile();
const MAX_ENTRIES = 20;
const MAX_AGE_SECONDS = 3600; // 1 hour

function getInstanceId() {
    /** Get current instance ID from env. */
    return process.env.CLAUDE_INSTANCE ?? '?';
}

function loadRecentPool() {
    /** Load recent, relevant pool entries. */
    if (!fs.existsSync(POOL_FILE)) {
        return [];
    }

    const now = Date.now() / 1000;
    const entries = [];
    const instanceId = getInstanceId();

    const content = fs.readFileSync(POOL_FILE, 'utf8');
    const lines = content.split('\n');

    for (const line of lines) {
        if (!line.trim()) continue;

        try {
            const entry = JSON.parse(line);

            // Filter by age
            const entryAge = now - (entry.timestamp ?? 0);
            if (entryAge > MAX_AGE_SECONDS) {
                continue;
            }

            // Filter by relevance to this instance
            const relevance = entry.relevance?.[instanceId] ?? 0;
            const source = entry.source_instance ?? '?';

            // Include if:
            // 1. From this instance (own history)
            // 2. High relevance (>= 0.3)
            // 3. Blocks something (always relevant)
            if (source === instanceId || relevance >= 0.3 || entry.blocks) {
                entries.push(entry);
            }
        } catch (e) {
            continue;
        }
    }

    // Sort by timestamp desc, take most recent
    entries.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
    return entries.slice(0, MAX_ENTRIES);
}

function formatTimeAgo(seconds) {
    /** Format seconds as human-readable time ago. */
    if (seconds < 60) {
        return `${Math.floor(seconds)}s ago`;
    } else if (seconds < 3600) {
        return `${Math.floor(seconds / 60)}m ago`;
    } else {
        return `${Math.floor(seconds / 3600)}h ago`;
    }
}

function formatPoolContext(entries) {
    /** Format entries for injection. */
    if (!entries.length) {
        return '';
    }

    const instanceId = getInstanceId();
    const now = Date.now() / 1000;

    const lines = [
        '## Recent Instance Activity',
        `> You are Instance **${instanceId}** in a distributed development system.`,
        '> Recent work by you and other instances:\n'
    ];

    for (const entry of entries) {
        const timeAgo = formatTimeAgo(now - (entry.timestamp ?? 0));
        const source = entry.source_instance ?? '?';
        const action = entry.action ?? 'signaling';
        const topic = entry.topic ?? 'unknown';
        const summary = entry.summary ?? '';
        const affects = entry.affects ?? '';
        const blocks = entry.blocks ?? '';
        const relevance = entry.relevance?.[instanceId] ?? 0;

        // Format based on source
        let prefix;
        if (source === instanceId) {
            prefix = '**[YOU]**';
        } else {
            prefix = `**[${source}]**`;
        }

        // Format action
        const actionEmojiMap = {
            'completed': 'DONE',
            'blocked': 'BLOCKED',
            'signaling': 'SIGNAL',
            'claimed': 'CLAIMED',
            'health': 'HEALTH'
        };
        const actionLabel = actionEmojiMap[action] ?? 'INFO';

        lines.push(`${prefix} ${actionLabel} **${action}** - ${topic}`);
        lines.push(`  _${summary}_`);

        if (affects) {
            lines.push(`  Affects: \`${affects}\``);
        }

        if (blocks) {
            lines.push(`  Unblocks: ${blocks}`);
        }

        lines.push(`  ${timeAgo} | Relevance: ${Math.round(relevance * 100)}%\n`);
    }

    lines.push('---\n');

    return lines.join('\n');
}

function getProjectName() {
    /** Detect project name from various sources. */

    // Try 1: Git remote URL
    try {
        const url = execSync('git config --get remote.origin.url', {
            encoding: 'utf8',
            timeout: 1000,
            stdio: ['pipe', 'pipe', 'pipe']
        }).trim();

        if (url) {
            const name = url.replace(/\/$/, '').split('/').pop().replace('.git', '');
            if (name) {
                return name;
            }
        }
    } catch (e) {
        // Git command failed
    }

    // Try 2: Git repo root directory name
    try {
        const repoPath = execSync('git rev-parse --show-toplevel', {
            encoding: 'utf8',
            timeout: 1000,
            stdio: ['pipe', 'pipe', 'pipe']
        }).trim();

        if (repoPath) {
            const name = path.basename(repoPath);
            if (name) {
                return name;
            }
        }
    } catch (e) {
        // Git command failed
    }

    // Try 3: Current working directory name
    const cwdName = path.basename(process.cwd());
    if (cwdName) {
        return cwdName;
    }

    // Fallback
    return 'Current Project';
}

function formatCompactOutput() {
    /** Format compact output for SessionStart hook. */
    const entries = loadRecentPool();

    if (!entries.length) {
        const projectName = getProjectName();
        return `## Session Context\n- **Codebase**: ${projectName}\n- **Instance Pool**: No recent activity\n`;
    }

    // Get counts
    const instanceId = getInstanceId();
    const ownCount = entries.filter(e => e.source_instance === instanceId).length;
    const otherCount = entries.length - ownCount;
    const blockedCount = entries.filter(e => e.action === 'blocked').length;
    const completedCount = entries.filter(e => e.action === 'completed').length;

    // Compact summary
    const lines = [
        '## Session Context',
        `- **Instance**: ${instanceId}`,
        `- **Pool**: ${entries.length} recent (${ownCount} own, ${otherCount} others)`,
        `- **Status**: ${completedCount} completed, ${blockedCount} blocked`
    ];

    // Show only most relevant/recent 5
    const topEntries = entries.slice(0, 5);
    if (topEntries.length) {
        lines.push('\n### Recent Activity');
        for (const entry of topEntries) {
            const source = entry.source_instance ?? '?';
            const action = entry.action ?? '';
            const topic = entry.topic ?? '';
            lines.push(`- [${source}] ${action}: ${topic}`);
        }
    }

    return lines.join('\n') + '\n';
}

function main() {
    try {
        // Check if we want compact or full output
        const compact = (process.env.POOL_COMPACT ?? '1') === '1';

        let output;
        if (compact) {
            output = formatCompactOutput();
        } else {
            const entries = loadRecentPool();
            output = formatPoolContext(entries);
        }

        if (output) {
            console.log(output);
        }
    } catch (e) {
        // Fail gracefully
        const errorLogPath = path.join(os.homedir(), '.claude', 'pool', 'loader_errors.log');
        try {
            const timestamp = new Date().toISOString();
            fs.appendFileSync(errorLogPath, `${timestamp}: ${e.message}\n${e.stack}\n`);
        } catch (logError) {
            // Can't even log the error
        }
    }

    process.exit(0);
}

main();
