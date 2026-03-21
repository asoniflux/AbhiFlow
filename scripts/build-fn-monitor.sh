#!/bin/bash
# Compile the Fn key monitor Swift helper for macOS.
# Run this once on your Mac: bash scripts/build-fn-monitor.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SRC="$PROJECT_DIR/helpers/fn-monitor.swift"
OUT="$PROJECT_DIR/helpers/fn-monitor"

echo "Compiling fn-monitor..."
swiftc -O -o "$OUT" "$SRC" -framework Cocoa
chmod +x "$OUT"
echo "Built: $OUT"
