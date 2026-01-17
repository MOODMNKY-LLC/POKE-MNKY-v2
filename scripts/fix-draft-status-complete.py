#!/usr/bin/env python3
"""Complete fix for get_draft_status - schema and return statements"""
import re

# This will be run on the server
script_content = '''#!/usr/bin/env python3
import re

with open('src/index.ts', 'r') as f:
    content = f.read()

# Fix 1: Update output schema to accept nullable string
content = re.sub(
    r'current_team_id: z\.string\(\)\.optional\(\)',
    r'current_team_id: z.string().nullable().optional()',
    content
)

# Fix 2: Replace null with empty string in return statements
# When no session found
content = re.sub(
    r"current_team_id: null",
    r"current_team_id: ''",
    content
)

# When session exists
content = re.sub(
    r"current_team_id: session\.current_team_id \|\| null",
    r"current_team_id: session.current_team_id || ''",
    content
)

with open('src/index.ts', 'w') as f:
    f.write(content)

print("Fixed get_draft_status schema and return statements")
'''

print(script_content)
