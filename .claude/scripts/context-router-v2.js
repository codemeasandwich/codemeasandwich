#!/usr/bin/env node
/**
 * Attentional Context Router v2.0
 * ================================
 * Implements working memory dynamics for Claude Code context injection.
 *
 * Architecture:
 * - HOT (>0.8): Full file injection - active development
 * - WARM (0.25-0.8): Header/summary only - background awareness
 * - COLD (<0.25): Evicted from context
 *
 * Features:
 * - Decay: Unmentioned files fade (configurable per category)
 * - Co-activation: Related files boost each other
 * - Pinned files: Critical topology always at least warm
 * - State persistence: Attention scores survive across turns
 * - Usage tracking: Log injections for learning (v1.2)
 *
 * Usage: Called by UserPromptSubmit hook
 * Input: JSON from stdin with "prompt" field
 * Output: Tiered context to stdout
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// ============================================================================
// DOCS ROOT RESOLUTION
// ============================================================================

function resolveDocsRoot() {
    /**
     * Resolve documentation root with correct priority order.
     *
     * Priority:
     * 1. CONTEXT_DOCS_ROOT environment variable (explicit override)
     * 2. Project-local .claude/ directory (if exists with .md files)
     * 3. Global ~/.claude/ directory (fallback)
     */

    // Priority 1: Explicit environment variable
    const envRoot = process.env.CONTEXT_DOCS_ROOT;
    if (envRoot) {
        const envPath = path.resolve(envRoot.replace(/^~/, os.homedir()));
        if (fs.existsSync(envPath) && fs.statSync(envPath).isDirectory()) {
            console.error(`ℹ Using CONTEXT_DOCS_ROOT: ${envPath}`);
            return envPath;
        } else {
            console.error(`⚠ CONTEXT_DOCS_ROOT set but not found: ${envPath}`);
        }
    }

    // Priority 2: Project-local .claude/
    const projectClaude = path.join(process.cwd(), '.claude');
    if (fs.existsSync(projectClaude) && fs.statSync(projectClaude).isDirectory()) {
        const mdFiles = findMdFiles(projectClaude);
        if (mdFiles.length > 0) {
            console.error(`ℹ Using project-local .claude: ${projectClaude}`);
            console.error(`  Found ${mdFiles.length} .md files`);
            return projectClaude;
        } else {
            console.error(`⚠ Project .claude/ exists but has no .md files: ${projectClaude}`);
        }
    }

    // Priority 3: Global ~/.claude/
    const globalClaude = path.join(os.homedir(), '.claude');
    if (fs.existsSync(globalClaude) && fs.statSync(globalClaude).isDirectory()) {
        const mdFiles = findMdFiles(globalClaude);
        if (mdFiles.length > 0) {
            console.error(`ℹ Using global ~/.claude: ${globalClaude}`);
            console.error(`  Found ${mdFiles.length} .md files`);
            return globalClaude;
        } else {
            console.error(`⚠ Global ~/.claude/ exists but has no .md files`);
        }
    }

    throw new Error(
        '\n' +
        '═══════════════════════════════════════════════════════════════\n' +
        'ERROR: No .claude/ directory with documentation found.\n' +
        '\n' +
        'Please create .claude/ in your project root and add .md files:\n' +
        '  mkdir -p .claude/\n' +
        '  echo "# My Project" > .claude/README.md\n' +
        '\n' +
        'Or set explicit path:\n' +
        '  export CONTEXT_DOCS_ROOT=/path/to/docs\n' +
        '═══════════════════════════════════════════════════════════════\n'
    );
}

function findMdFiles(dir) {
    const results = [];
    try {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
            const fullPath = path.join(dir, item.name);
            if (item.isDirectory()) {
                results.push(...findMdFiles(fullPath));
            } else if (item.name.endsWith('.md')) {
                results.push(fullPath);
            }
        }
    } catch (e) {
        // Ignore errors
    }
    return results;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

// State file location
const PROJECT_STATE = path.join('.claude', 'attn_state.json');
const GLOBAL_STATE = path.join(os.homedir(), '.claude', 'attn_state.json');
const HISTORY_FILE = path.join(os.homedir(), '.claude', 'attention_history.jsonl');

// History retention
const MAX_HISTORY_DAYS = 30;

// Decay rates per category
const DECAY_RATES = {
    "systems/": 0.85,
    "modules/": 0.70,
    "integrations/": 0.80,
    "docs/": 0.75,
    "default": 0.70
};

// Attention thresholds
const HOT_THRESHOLD = 0.8;
const WARM_THRESHOLD = 0.25;

// Boost amounts
const KEYWORD_BOOST = 1.0;
const COACTIVATION_BOOST = 0.35;

// Limits
const MAX_HOT_FILES = 4;
const MAX_WARM_FILES = 8;
const WARM_HEADER_LINES = 25;
const MAX_TOTAL_CHARS = 25000;

// Pinned files
const PINNED_FILES = [
    "systems/network.md",
];

// ============================================================================
// CONFIG LOADING
// ============================================================================

function loadKeywordConfig() {
    const configPaths = [
        path.join('.claude', 'keywords.json'),
        path.join(os.homedir(), '.claude', 'keywords.json')
    ];

    for (const configPath of configPaths) {
        if (fs.existsSync(configPath)) {
            try {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                const keywords = config.keywords || {};
                const coActivation = config.co_activation || {};

                if (keywords && typeof keywords === 'object') {
                    console.error(`✓ Loaded keywords from ${configPath}`);
                    return [keywords, coActivation];
                }
            } catch (e) {
                console.error(`⚠ Failed to load ${configPath}: ${e.message}`);
                continue;
            }
        }
    }

    console.error('ℹ Using hardcoded keywords (no keywords.json found)');
    return [_DEFAULT_KEYWORDS, _DEFAULT_CO_ACTIVATION];
}

// ============================================================================
// KEYWORD MAPPINGS (Hardcoded fallback)
// ============================================================================

const _DEFAULT_KEYWORDS = {
    "systems/legion.md": [
        "legion", "5090", "rtx 5090", "local model", "local", "discord bot",
        "vram", "oom", "cuda", "nvidia-smi", "dolphin", "mirrorbot_cvmp"
    ],
    "systems/asus.md": [
        "asus", "tuf", "4070", "rtx 4070", "llava", "vision", "visual",
        "remote server", "image generation", "image gen", "sdxl", "ssd-1b"
    ],
    "systems/orin.md": [
        "orin", "jetson", "sensory", "sensory cortex", "layer 0", "l0", "perception",
        "camera", "servo", "embodiment", "vmpu", "motor", "sentiment"
    ],
    "systems/pi5.md": [
        "pi5", "pi 5", "raspberry", "hmcp", "agency", "memory", "hybrid memory",
        "co-processor", "consolidation", "dream", "sleep cycle"
    ],
    "systems/network.md": [
        "network", "topology", "architecture", "data flow", "mesh", "switch",
        "system overview", "how it connects", "integration map"
    ],
    "modules/pipeline.md": [
        "pipeline", "process_message", "refined_pipeline", "8-layer"
    ],
    "modules/intelligence.md": [
        "intelligence", "reasoning", "multi-step", "mcts", "tree reasoning"
    ],
    "modules/t3-telos.md": [
        "t3", "telos", "trajectory", "tesseract", "curvature steering",
        "gtf", "global topology", "emotional", "dynamics"
    ],
    "modules/cvmp-transformer.md": [
        "cvmp transformer", "cvmp model", "cvmp", "transformer", "oracle",
        "consciousness prediction", "tier prediction"
    ],
    "CLAUDE.md": [
        "claude", "persona", "tars", "workflow", "phase"
    ],
    "personas/persona-tars.md": [
        "tars", "persona", "identity", "how i work"
    ]
};

const _DEFAULT_CO_ACTIVATION = {
    "systems/orin.md": [
        "integrations/pipe-to-orin.md",
        "modules/t3-telos.md"
    ],
    "systems/legion.md": [
        "integrations/pipe-to-orin.md",
        "integrations/img-to-asus.md",
        "modules/t3-telos.md",
        "modules/intelligence.md",
        "modules/pipeline.md"
    ],
    "modules/t3-telos.md": [
        "modules/cvmp-transformer.md",
        "modules/pipeline.md"
    ],
    "modules/intelligence.md": [
        "modules/cvmp-transformer.md",
        "modules/pipeline.md"
    ]
};

// Load configuration
let [KEYWORDS, CO_ACTIVATION] = loadKeywordConfig();

// ============================================================================
// AUTO-DETECT TODO/ TASK TRACKING FILES
// ============================================================================

function autoDetectTodoFiles() {
    const todoKeywords = {};
    const todoPinned = [];

    const recoveryTerms = [
        "task", "status", "progress", "resume", "handoff", "recovery",
        "todo", "tracking", "session", "continue", "where was i",
        "what was i doing", "pick up", "left off", "context"
    ];

    const todoDir = path.join(process.cwd(), 'todo');
    if (fs.existsSync(todoDir) && fs.statSync(todoDir).isDirectory()) {
        let mdFiles;
        try {
            mdFiles = fs.readdirSync(todoDir).filter(f => f.endsWith('.md'));
        } catch (e) {
            mdFiles = [];
        }

        for (const mdFile of mdFiles) {
            const relPath = path.join('todo', mdFile);
            todoKeywords[relPath] = [...recoveryTerms];

            const stem = path.basename(mdFile, '.md');
            const stemSpaced = stem.replace(/-/g, ' ').replace(/_/g, ' ');
            todoKeywords[relPath].push(stemSpaced);
            todoKeywords[relPath].push(stem);

            todoPinned.push(relPath);
        }

        if (mdFiles.length > 0) {
            console.error(`✓ Auto-detected ${mdFiles.length} task tracking files in todo/`);
        }
    }

    return [todoKeywords, todoPinned];
}

const [_TODO_KEYWORDS, _TODO_PINNED] = autoDetectTodoFiles();
Object.assign(KEYWORDS, _TODO_KEYWORDS);
PINNED_FILES.push(..._TODO_PINNED);

// ============================================================================
// PHASE DETECTION
// ============================================================================

const PHASES_DIR = path.join(os.homedir(), '.claude', 'phases');

const PHASE_KEYWORDS = {
    1: ["clarify", "requirements", "problem", "request", "understand", "capture", "log the request"],
    2: ["user story", "acceptance criteria", "scope", "functional requirements", "in scope", "out of scope"],
    3: ["design", "architecture", "plan", "approach", "high-level", "technical constraints"],
    4: ["task", "breakdown", "subtask", "parallel workstream", "[p]", "[s]", "implementation roadmap"],
    5: ["implement", "code", "build", "fix", "write", "create", "test", "branch"],
    6: ["commit", "merge", "deploy", "demo", "review", "done", "complete", "verify"]
};

function detectPhase(prompt, state) {
    const promptLower = prompt.toLowerCase();

    const scores = {};
    for (const phase of Object.keys(PHASE_KEYWORDS)) {
        scores[phase] = 0;
    }

    for (const [phase, keywords] of Object.entries(PHASE_KEYWORDS)) {
        for (const kw of keywords) {
            if (promptLower.includes(kw)) {
                scores[phase] += 1;
            }
        }
    }

    const maxScore = Math.max(...Object.values(scores));
    if (maxScore > 0) {
        const detected = parseInt(Object.entries(scores).reduce((a, b) =>
            scores[a[0]] > scores[b[0]] ? a : b
        )[0]);
        state.current_phase = detected;
        return detected;
    }

    return state.current_phase ?? 5;
}

function loadPhaseContent(phase) {
    const phaseFile = path.join(PHASES_DIR, `phase-${phase}.md`);
    const sharedFile = path.join(PHASES_DIR, 'shared.md');

    const contentParts = [];

    if (fs.existsSync(sharedFile)) {
        try {
            contentParts.push(fs.readFileSync(sharedFile, 'utf8'));
        } catch (e) {
            // Ignore
        }
    }

    if (fs.existsSync(phaseFile)) {
        try {
            contentParts.push(`\n━━━ [📋 ACTIVE PHASE: ${phase}] ━━━\n`);
            contentParts.push(fs.readFileSync(phaseFile, 'utf8'));
        } catch (e) {
            // Ignore
        }
    }

    return contentParts.length > 0 ? contentParts.join('\n') : "";
}

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

function getStateFile() {
    const projectStateDir = path.dirname(PROJECT_STATE);
    if (fs.existsSync(projectStateDir)) {
        return PROJECT_STATE;
    }
    const globalStateDir = path.dirname(GLOBAL_STATE);
    if (!fs.existsSync(globalStateDir)) {
        fs.mkdirSync(globalStateDir, { recursive: true });
    }
    return GLOBAL_STATE;
}

function loadState(stateFile) {
    if (fs.existsSync(stateFile)) {
        try {
            return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
        } catch (e) {
            // Return fresh state
        }
    }

    const scores = {};
    for (const filePath of Object.keys(KEYWORDS)) {
        scores[filePath] = 0.0;
    }

    return {
        scores: scores,
        turn_count: 0,
        current_phase: 1,
        last_update: new Date().toISOString(),
    };
}

function saveState(stateFile, state) {
    state.last_update = new Date().toISOString();
    const stateDir = path.dirname(stateFile);
    if (!fs.existsSync(stateDir)) {
        fs.mkdirSync(stateDir, { recursive: true });
    }
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
}

// ============================================================================
// ATTENTION DYNAMICS
// ============================================================================

function getDecayRate(filePath) {
    for (const [prefix, rate] of Object.entries(DECAY_RATES)) {
        if (prefix !== 'default' && filePath.startsWith(prefix)) {
            return rate;
        }
    }
    return DECAY_RATES.default;
}

function updateAttention(state, prompt) {
    const promptLower = prompt.toLowerCase();
    const directlyActivated = new Set();

    // Phase 1: Decay all scores
    for (const filePath of Object.keys(state.scores)) {
        const decay = getDecayRate(filePath);
        state.scores[filePath] *= decay;
    }

    // Phase 2: Keyword activation
    for (const [filePath, keywords] of Object.entries(KEYWORDS)) {
        if (keywords.some(kw => promptLower.includes(kw))) {
            state.scores[filePath] = KEYWORD_BOOST;
            directlyActivated.add(filePath);
        }
    }

    // Phase 3: Co-activation boost
    for (const activatedPath of directlyActivated) {
        if (CO_ACTIVATION[activatedPath]) {
            for (const relatedPath of CO_ACTIVATION[activatedPath]) {
                if (state.scores[relatedPath] !== undefined) {
                    const current = state.scores[relatedPath];
                    state.scores[relatedPath] = Math.min(1.0, current + COACTIVATION_BOOST);
                }
            }
        }
    }

    // Phase 4: Pinned file floor
    for (const pinned of PINNED_FILES) {
        if (state.scores[pinned] !== undefined) {
            state.scores[pinned] = Math.max(state.scores[pinned], WARM_THRESHOLD + 0.1);
        }
    }

    state.turn_count = (state.turn_count ?? 0) + 1;
    return [state, directlyActivated];
}

// ============================================================================
// CONTENT EXTRACTION
// ============================================================================

function resolveFilePath(filePath, docsRoot) {
    const fullPath = path.join(docsRoot, filePath);
    if (fs.existsSync(fullPath)) {
        return fullPath;
    }

    const cwdPath = path.join(process.cwd(), filePath);
    if (fs.existsSync(cwdPath)) {
        return cwdPath;
    }

    return null;
}

function extractWarmHeader(filePath, docsRoot) {
    const fullPath = resolveFilePath(filePath, docsRoot);
    if (!fullPath) {
        return null;
    }

    try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n').slice(0, WARM_HEADER_LINES);
        let header = lines.join('\n');

        if (content.split('\n').length > WARM_HEADER_LINES) {
            header += "\n\n... [WARM: Content truncated, mention to expand] ...";
        }

        return header;
    } catch (e) {
        return `[Error reading ${filePath}: ${e.message}]`;
    }
}

function getFullContent(filePath, docsRoot) {
    const fullPath = resolveFilePath(filePath, docsRoot);
    if (!fullPath) {
        return null;
    }

    try {
        return fs.readFileSync(fullPath, 'utf8');
    } catch (e) {
        return `[Error reading ${filePath}: ${e.message}]`;
    }
}

// ============================================================================
// TIERED INJECTION
// ============================================================================

function getTier(score) {
    if (score >= HOT_THRESHOLD) {
        return "HOT";
    } else if (score >= WARM_THRESHOLD) {
        return "WARM";
    }
    return "COLD";
}

function buildContextOutput(state, docsRoot) {
    const sortedFiles = Object.entries(state.scores)
        .sort((a, b) => b[1] - a[1]);

    const hotBlocks = [];
    const warmBlocks = [];
    const stats = { hot: 0, warm: 0, cold: 0 };
    let totalChars = 0;

    for (const [filePath, score] of sortedFiles) {
        const tier = getTier(score);

        if (tier === "HOT" && stats.hot < MAX_HOT_FILES) {
            const content = getFullContent(filePath, docsRoot);
            if (content && totalChars + content.length < MAX_TOTAL_CHARS) {
                hotBlocks.push(`━━━ [🔥 HOT] ${filePath} (score: ${score.toFixed(2)}) ━━━\n${content}`);
                totalChars += content.length;
                stats.hot += 1;
            } else if (content) {
                const header = extractWarmHeader(filePath, docsRoot);
                if (header) {
                    warmBlocks.push(`━━━ [🌡️ WARM] ${filePath} (score: ${score.toFixed(2)}) ━━━\n${header}`);
                    totalChars += header.length;
                    stats.warm += 1;
                }
            }

        } else if (tier === "WARM" && stats.warm < MAX_WARM_FILES) {
            const header = extractWarmHeader(filePath, docsRoot);
            if (header && totalChars + header.length < MAX_TOTAL_CHARS) {
                warmBlocks.push(`━━━ [🌡️ WARM] ${filePath} (score: ${score.toFixed(2)}) ━━━\n${header}`);
                totalChars += header.length;
                stats.warm += 1;
            }

        } else {
            stats.cold += 1;
        }
    }

    const outputParts = [];

    outputParts.push(`╔══ ATTENTION STATE [Turn ${state.turn_count}] ══╗`);
    outputParts.push(`║ 🔥 Hot: ${stats.hot} │ 🌡️ Warm: ${stats.warm} │ ❄️ Cold: ${stats.cold} ║`);
    outputParts.push(`║ Total chars: ${totalChars.toLocaleString()} / ${MAX_TOTAL_CHARS.toLocaleString()} ║`);
    outputParts.push("╚" + "═".repeat(38) + "╝");

    outputParts.push(...hotBlocks);
    outputParts.push(...warmBlocks);

    return [outputParts.join("\n\n"), stats];
}

// ============================================================================
// ATTENTION HISTORY TRACKING
// ============================================================================

function computeTransitions(prevState, currState) {
    const transitions = { to_hot: [], to_warm: [], to_cold: [] };

    for (const [filePath, score] of Object.entries(currState.scores)) {
        const prevScore = (prevState.scores || {})[filePath] ?? 0.0;
        const prevTier = getTier(prevScore);
        const currTier = getTier(score);

        if (currTier !== prevTier) {
            if (currTier === "HOT") {
                transitions.to_hot.push(filePath);
            } else if (currTier === "WARM") {
                transitions.to_warm.push(filePath);
            } else {
                transitions.to_cold.push(filePath);
            }
        }
    }

    return transitions;
}

function appendHistory(state, prevState, activated, prompt, stats) {
    const stopWords = new Set(["the", "a", "an", "is", "are", "to", "for", "and", "or", "in", "on", "it", "this", "that", "with", "of"]);
    const words = prompt.split(/\s+/)
        .filter(w => w.length > 2 && !stopWords.has(w.toLowerCase()))
        .slice(0, 8)
        .map(w => w.toLowerCase());

    const entry = {
        turn: state.turn_count,
        timestamp: new Date().toISOString(),
        instance_id: process.env.CLAUDE_INSTANCE ?? "default",
        prompt_keywords: words,
        activated: Array.from(activated).sort(),
        hot: Object.entries(state.scores).filter(([p, s]) => getTier(s) === "HOT").map(([p]) => p).sort(),
        warm: Object.entries(state.scores).filter(([p, s]) => getTier(s) === "WARM").map(([p]) => p).sort(),
        cold_count: stats.cold,
        transitions: computeTransitions(prevState, state),
        total_chars: stats.total_chars ?? 0
    };

    try {
        const historyDir = path.dirname(HISTORY_FILE);
        if (!fs.existsSync(historyDir)) {
            fs.mkdirSync(historyDir, { recursive: true });
        }

        if (!fs.existsSync(HISTORY_FILE)) {
            fs.writeFileSync(HISTORY_FILE, '');
        }

        fs.appendFileSync(HISTORY_FILE, JSON.stringify(entry) + "\n");
    } catch (e) {
        // Don't fail hook on history write error
    }
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

function main() {
    let prompt = "";
    try {
        const inputRaw = fs.readFileSync(0, 'utf8');
        const inputData = JSON.parse(inputRaw);
        prompt = inputData.prompt ?? "";
    } catch (e) {
        try {
            prompt = fs.readFileSync(0, 'utf8');
        } catch (e2) {
            prompt = "";
        }
    }

    if (!prompt.trim()) {
        return;
    }

    let docsRoot;
    try {
        docsRoot = resolveDocsRoot();
    } catch (e) {
        console.error(e.message);
        return;
    }

    const stateFile = getStateFile();
    const prevState = loadState(stateFile);
    let state = JSON.parse(JSON.stringify(prevState));

    let activated;
    [state, activated] = updateAttention(state, prompt);

    const phase = detectPhase(prompt, state);
    const phaseContent = loadPhaseContent(phase);

    let [output, stats] = buildContextOutput(state, docsRoot);

    if (phaseContent) {
        output = phaseContent + "\n\n" + output;
    }
    stats.total_chars = output.length;

    appendHistory(state, prevState, activated, prompt, stats);

    saveState(stateFile, state);

    const logFile = path.join(os.homedir(), '.claude', 'context_injection.log');
    try {
        let logContent = "\n" + "=".repeat(80) + "\n";
        logContent += `[${new Date().toISOString()}] Turn ${state.turn_count}\n`;
        logContent += `Prompt (first 100 chars): ${prompt.slice(0, 100)}...\n`;
        logContent += `Stats: Hot=${stats.hot}, Warm=${stats.warm}, Cold=${stats.cold}\n`;
        logContent += `Total chars: ${output.length.toLocaleString()}\n`;
        logContent += `Activated files: ${activated.size > 0 ? Array.from(activated).join(', ') : 'none'}\n`;
        logContent += "=".repeat(80) + "\n";
        logContent += output;
        logContent += "\n" + "=".repeat(80) + "\n\n";

        fs.appendFileSync(logFile, logContent);
    } catch (e) {
        // Don't fail hook if logging fails
    }

    if (stats.hot > 0 || stats.warm > 0) {
        console.log(output);
    }
}

main();
