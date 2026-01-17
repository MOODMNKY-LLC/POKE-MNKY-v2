#!/bin/bash
# Fix session cleanup and management issues

sshpass -p 'MOODMNKY88' ssh moodmnky@10.3.0.119 << 'ENDSSH'
cd /home/moodmnky/POKE-MNKY/tools/mcp-servers/draft-pool-server

# Create backup
cp src/index.ts src/index.ts.backup-session-fix-$(date +%Y%m%d-%H%M%S)

# Use Python to fix session management
python3 << 'PYTHON'
import re

with open('src/index.ts', 'r') as f:
    content = f.read()

# Fix 1: Reduce session timeout from 10 minutes to 5 minutes
content = re.sub(
    r'SESSION_TIMEOUT = 10 \* 60 \* 1000; // 10 minutes',
    r'SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes (reduced for better cleanup)',
    content
)

# Fix 2: Reduce cleanup interval from 60s to 30s for more frequent cleanup
content = re.sub(
    r'const CLEANUP_INTERVAL = 60000; // Check every minute',
    r'const CLEANUP_INTERVAL = 30000; // Check every 30 seconds (more frequent cleanup)',
    content
)

# Fix 3: Update lastAccess even when creating new sessions (track all activity)
# Find the session creation and add lastAccess update
pattern = r'(sessions\.set\(sessionId, \{ transport, lastAccess: now, createdAt: now \}\);)\s*(console\.log\(`Created new session)'
replacement = r'\1\n        // Update lastAccess on creation to track activity\n        const session = sessions.get(sessionId)!;\n        session.lastAccess = now;\n        \2'
content = re.sub(pattern, replacement, content)

# Fix 4: Add cleanup logging even when no sessions cleaned (for debugging)
pattern = r'(if \(cleanedCount > 0 \|\| errorCount > 0\) \{\s*console\.log\(`Session cleanup: removed \$\{cleanedCount\} sessions)'
replacement = r'// Always log cleanup status for debugging\n  if (cleanedCount > 0 || errorCount > 0) {\n    console.log(`Session cleanup: removed ${cleanedCount} sessions'
content = re.sub(pattern, replacement, content)

# Add else clause to log when no cleanup needed
pattern = r'(console\.log\(`Session cleanup: removed \$\{cleanedCount\} sessions, \$\{errorCount\} errors, \$\{sessions\.size\} remaining`\);\s*\}\s*\}, CLEANUP_INTERVAL\);)'
replacement = r'\1\n  } else {\n    // Log periodically even when no cleanup needed (every 10 checks = ~5 minutes)\n    const checkCount = (Date.now() / CLEANUP_INTERVAL) % 10;\n    if (checkCount < 1) {\n      console.log(`Session cleanup check: ${sessions.size} active sessions, oldest: ${Math.round((Date.now() - Math.min(...Array.from(sessions.values()).map(s => s.createdAt))) / 1000)}s`);\n    }\n  }'
content = re.sub(pattern, replacement, content)

with open('src/index.ts', 'w') as f:
    f.write(content)

print("Fixed session cleanup:")
print("1. Reduced timeout to 5 minutes")
print("2. Reduced cleanup interval to 30 seconds")
print("3. Added lastAccess tracking on creation")
print("4. Added periodic logging")
PYTHON

# Rebuild
cd /home/moodmnky/POKE-MNKY
docker compose up -d --build draft-pool-mcp-server

echo "Done! Container rebuilt with session cleanup fixes"
ENDSSH
