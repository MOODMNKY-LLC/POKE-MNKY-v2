---
name: docs-lookup
description: Fetch and summarize current documentation or API references using Context7, Fetch, and FireCrawl MCPs. Use when the user needs up-to-date docs, library examples, or content from specific URLs.
disable-model-invocation: true
---

# Docs Lookup Skill

Use this skill when the user needs current documentation, API references, or library examples. It directs the agent to use MCPs (Context7, Fetch, FireCrawl) to retrieve and summarize docs, and to cite sources.

## When to Use

- User asks to "look up X docs," "get current API for Y," "find Tailwind/Next.js/React usage," or similar.
- User provides a URL and wants content summarized or extracted.
- User needs library or framework examples with accurate, up-to-date syntax or behavior.

Invoke explicitly via `/docs-lookup` or when the user explicitly asks for documentation lookup.

## Instructions

### Tool selection

1. **Context7** (plugin-context7): Prefer for library and framework documentation (e.g. Next.js, React, Tailwind, shadcn, Radix). Use to retrieve up-to-date docs and code examples. Check the Context7 MCP tool schema before use.
2. **Fetch** (user-fetch): Use for single, known URLs when you need quick content retrieval without heavy processing. No API key required; fastest for simple GETs.
3. **FireCrawl**: Use for multi-page sites, complex pages, or when the user provides a URL and you need structured extraction or batch-like processing. Requires FIRECRAWL_API_KEY when used.

### Workflow

- If the user names a library or framework (e.g. "Next.js 14 App Router," "Tailwind v4"): Start with Context7 to search and fetch relevant docs; supplement with Fetch if Context7 points to a specific URL you need in full.
- If the user provides a URL: Use Fetch for a single page; use FireCrawl if the site is multi-page or JavaScript-heavy.
- Always cite sources: include doc name, version or URL, and section or anchor when possible.
- Return concise, actionable snippets (code or steps) that the user can apply; avoid long paste of entire pages unless necessary.

### Conventions

- Prefer official or canonical docs over random blog posts unless the user asks otherwise.
- If a tool is unavailable (e.g. Context7 or FireCrawl not configured), use whatever is available (e.g. Fetch) and say so.
- When in doubt, use the ask-the-user tool to clarify which library, version, or URL they mean.
