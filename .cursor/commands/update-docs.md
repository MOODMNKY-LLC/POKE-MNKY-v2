---
description: Update or add documentation (docs/, mnky-docs) for the current feature or change; use docs agent and mintlify rule.
---

# Update docs

Use the **docs** agent and the **mintlify-technical-writing** rule to update or add documentation for the current feature or change.

1. Identify what changed or what feature needs docs (from diff, user message, or recent edits).
2. Decide scope: `docs/` (project markdown), `mnky-docs/` (Mintlify), or both. For Mintlify, update `mnky-docs/docs.json` if adding or moving pages.
3. Follow mintlify-technical-writing: second person, active voice, Mintlify components (Note, Tip, CodeGroup) where useful. Use proper frontmatter in MDX.
4. Add or update only documentation; do not change application code unless the user asks for both.

Anything after the command (e.g. `/update-docs new Blender MCP page`) is added context.
