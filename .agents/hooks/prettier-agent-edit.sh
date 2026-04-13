#!/usr/bin/env bash
# Formats agent-edited files with Prettier (Cursor afterFileEdit / afterTabFileEdit).
# stdin: hook JSON with .file_path (also accepts .tool_response.filePath / .tool_input.file_path if reused elsewhere).
input=$(cat)
f=$(echo "$input" | jq -r '.tool_response.filePath // .tool_input.file_path // .file_path // empty' 2>/dev/null || true)
if [[ -n "$f" ]]; then
    npx prettier --write --ignore-unknown "$f" 2>/dev/null || true
fi
exit 0
