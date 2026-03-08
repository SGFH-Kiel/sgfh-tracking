#!/usr/bin/env bash
set -e

FIRESTORE_PORT=9099
AUTH_PORT=9098
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Kill any leftover emulator processes from a previous run
pkill -f "firebase-tools.*emulator" 2>/dev/null || true
sleep 1

echo "🔥 Starting Firebase emulators..."
firebase emulators:start --only firestore,auth --project sgfh-tracking-test > /tmp/firebase-emulator.log 2>&1 &
EMULATOR_PID=$!

# Wait for Firestore emulator to be ready
echo "⏳ Waiting for Firestore emulator on port $FIRESTORE_PORT..."
until curl -s "http://localhost:$FIRESTORE_PORT" > /dev/null 2>&1; do
  sleep 1
done
echo "✅ Firestore emulator ready."

# Wait for Auth emulator to be ready
echo "⏳ Waiting for Auth emulator on port $AUTH_PORT..."
until curl -s "http://localhost:$AUTH_PORT" > /dev/null 2>&1; do
  sleep 1
done
echo "✅ Auth emulator ready."

# Seed test data (idempotent — safe to run on every start)
echo "🌱 Seeding emulator with test data..."
node "$PROJECT_ROOT/scripts/seed-emulator.mjs"

# Clean up emulator on exit
cleanup() {
  echo ""
  echo "🛑 Stopping emulators (PID $EMULATOR_PID)..."
  kill $EMULATOR_PID 2>/dev/null || true
  wait $EMULATOR_PID 2>/dev/null || true
  echo "Done."
}
trap cleanup EXIT INT TERM

# Start the React app pointing at the emulator
echo "🚀 Starting React app with emulator config..."
cd "$PROJECT_ROOT"
env-cmd -f .env.emulator react-scripts start
