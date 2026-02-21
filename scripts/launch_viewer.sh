#!/bin/bash
# Launch DataTables Viewer with auto-token injection from TableScanner .env
# Usage: ./scripts/launch_viewer.sh [upa]

set -e

VIEWER_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SCANNER_ENV="$VIEWER_DIR/../tablescanner/.env"
DEFAULT_UPA="${1:-76990/7/2}"
PORT=3123

echo "🚀 DataTables Viewer Launcher"
echo "────────────────────────────────"

# 1. Extract token from TableScanner .env
if [ -f "$SCANNER_ENV" ]; then
    TOKEN=$(grep '^KB_SERVICE_AUTH_TOKEN=' "$SCANNER_ENV" | cut -d '=' -f2)
    if [ -n "$TOKEN" ] && [ "$TOKEN" != "your_token_here" ]; then
        echo "✅ Token extracted from tablescanner/.env"
    else
        echo "⚠️  Token in tablescanner/.env is placeholder. Enter your KBase token:"
        read -r TOKEN
    fi
else
    echo "⚠️  tablescanner/.env not found at: $SCANNER_ENV"
    echo "   Enter your KBase token (or press Enter to skip):"
    read -r TOKEN
fi

# 2. Generate app-config.json for auto-auth and auto-load
cat <<EOF > "$VIEWER_DIR/public/app-config.json"
{
  "upa": "$DEFAULT_UPA",
  "token": "$TOKEN"
}
EOF
echo "📝 Generated public/app-config.json (UPA: $DEFAULT_UPA)"

# 3. Kill any existing vite processes on the port
pkill -f "vite.*--port $PORT" 2>/dev/null || true

# 4. Start dev server
echo "🌐 Starting viewer on http://localhost:$PORT/?upa=$DEFAULT_UPA"
echo "────────────────────────────────"
cd "$VIEWER_DIR"
npm run dev -- --port "$PORT" --host --open
