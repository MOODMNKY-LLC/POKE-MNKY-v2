---
description: Security review — dependencies, code, and infrastructure.
---

# Security Audit

Use this for a structured security review. Anything after the command (e.g. `/security-audit before release`) is added context.

## 1. Dependency audit
- Check for known vulnerabilities (e.g. `pnpm audit`, npm audit)
- Update outdated packages
- Review third-party dependencies and licenses

## 2. Code security review
- Look for common vulnerabilities (injection, XSS, auth bypass)
- Review authentication and authorization
- Audit handling of secrets and sensitive data

## 3. Infrastructure and config
- Review environment variables and secrets (no secrets in repo)
- Check access controls and API keys
- Confirm production vs development boundaries

## Checklist
- [ ] Dependencies updated and audited
- [ ] No hardcoded secrets
- [ ] Input validation where needed
- [ ] Authentication and authorization correct
- [ ] Sensitive data handled safely
