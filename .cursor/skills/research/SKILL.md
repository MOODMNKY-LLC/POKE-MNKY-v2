---
name: research
description: Run the Deep Research Protocol for multi-source, verified research with a final narrative report. Use when the user asks for "research X," "deep dive on Y," or needs exhaustive investigation with themes, verification, and implications.
disable-model-invocation: true
---

# Research Skill

This skill runs the **Deep Research Protocol** defined in `.cursor/rules/deep-thinking.mdc`. Invoke it explicitly via `/research` or when the user explicitly requests deep research, a deep dive, or exhaustive investigation on a topic.

## When to Use

- User says "research X," "deep dive on Y," "exhaustive investigation," or similar.
- User needs a multi-source, verified research output with a final narrative report.
- User approves running the full protocol (initial engagement, research plan, then cycles and final report).

## Instructions

Follow the Deep Research Protocol in `.cursor/rules/deep-thinking.mdc`. Execute in order:

### 1. Initial engagement (stop point one)

- Ask 2–3 essential clarifying questions.
- Reflect your understanding of the request.
- Wait for the user's response before continuing.

### 2. Research planning (stop point two)

- Present to the user in clear text (not only in Sequential Thinking):
  1. List 3–5 major themes identified for investigation.
  2. For each theme: key questions, aspects to analyze, expected research approach.
  3. Research execution plan: tools per theme, order of investigation, expected depth.
- Wait for user approval before starting research cycles.

### 3. Research cycles (no stop points until final report)

For **each** approved theme:

- **Initial landscape**: Brave Search for broad context; Sequential Thinking (minimum 5 thoughts) to extract patterns, trends, knowledge structure, hypotheses, and uncertainties. Note key concepts, evidence, gaps, contradictions.
- **Deep investigation**: Tavily Search with `search_depth="advanced"` targeting gaps; Sequential Thinking to test hypotheses, challenge assumptions, find contradictions, and connect to other themes.
- **Integration**: Connect findings across sources, identify patterns, resolve or document contradictions, map relationships, form a unified understanding.
- Between tool uses: explicitly connect new findings to previous ones, show evolution of understanding, and maintain a coherent narrative.

**Tools** (from deep-thinking.mdc): Brave Search (max_results=20), Tavily Search (search_depth="advanced"), Sequential Thinking. Cross-reference sources and document reliability; flag conflicts for deeper investigation.

### 4. Final report (stop point three)

Produce a cohesive narrative report for the user that includes:

- **Knowledge development**: How understanding evolved through the research, how uncertainties were resolved or remained, and how perspectives shifted.
- **Comprehensive analysis**: Synthesis of evidence, patterns, contradictions, strength of evidence, limitations, and integration across themes—in flowing paragraphs, not bullet lists.
- **Practical implications**: Real-world applications, long-term implications, risks and mitigation, implementation considerations, future research directions, and broader impacts.

Write in academic-but-accessible style: substantial paragraphs (e.g. 6–8 per major section), assertions supported by multiple sources, narrative flow. Convert bullet points into prose in the final report.

## Notes

- Do not skip the initial engagement or research plan; always wait for user approval before running full cycles.
- Cite sources; acknowledge limitations and contradictions.
- This skill is invoked only when the user types `/research` or explicitly asks for deep research (disable-model-invocation: true).
