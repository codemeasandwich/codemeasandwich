#!/bin/bash
# Plays waiting sound immediately, then every 30 seconds until stopped

SOUND_FILE=~/.claude/sounds/waiting.mp3
PID_FILE=~/.claude/.waiting-sound-pid
DEBUG_LOG=~/.claude/.debug.log

# Debug logging
echo "[$(date '+%Y-%m-%d %H:%M:%S')] waiting-sound.sh triggered" >> "$DEBUG_LOG"

# Kill any existing waiting loop
if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE" 2>/dev/null)
  kill "$OLD_PID" 2>/dev/null
  rm -f "$PID_FILE"
fi

# Play immediately
afplay "$SOUND_FILE" &

# Start background loop
(
  while true; do
    sleep 30
    afplay "$SOUND_FILE"
  done
) &

# Save PID of the loop
echo $! > "$PID_FILE"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] waiting-sound.sh started loop with PID: $!" >> "$DEBUG_LOG"
