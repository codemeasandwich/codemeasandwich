#!/bin/bash
# Stops the waiting sound loop

PID_FILE=~/.claude/.waiting-sound-pid

if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE" 2>/dev/null)
  kill "$PID" 2>/dev/null
  rm -f "$PID_FILE"
fi
