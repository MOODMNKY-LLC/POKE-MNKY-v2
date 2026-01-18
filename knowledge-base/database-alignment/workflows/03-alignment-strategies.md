# Alignment Strategies

**Category**: Workflows  
**Purpose**: Methods and techniques for keeping local and production databases aligned

---

## Introduction

Maintaining alignment between local development and production databases is essential for effective development and reliable deployments. When databases drift out of alignment, developers lose confidence in local testing, deployments become risky, and troubleshooting becomes difficult. This guide provides comprehensive strategies for detecting, preventing, and resolving database misalignment.

---

## Understanding Alignment

### What is Database Alignment?

Database alignment means that local and production databases have identical schemas: the same tables, columns, data types, constraints, indexes, and other schema elements. Alignment doesn't mean identical data—local environments typically have small test datasets while production has real user data. But the structural schemas should match exactly.

Alignment also extends to migration state: the same migrations should be applied to both environments in the same order. When migration states align, developers can be confident that local testing reflects production behavior and that deployments will apply cleanly.

### Why Alignment Matters

Alignment enables confident local development. When local and production schemas match, developers know that code tested locally will work in production. This confidence enables faster development, reduces deployment anxiety, and prevents production issues.

Alignment also simplifies troubleshooting. When schemas match, problems can be reproduced locally and debugged safely. Without alignment, developers can't be sure whether issues are environment-specific or application bugs, making debugging much harder.

### Common Causes of Misalignment

Misalignment occurs when schemas diverge between environments. Common causes include manual schema changes in production that weren't captured in migrations, migrations applied to one environment but not another, or migrations applied in different orders. Understanding these causes helps prevent misalignment.

Manual changes are particularly problematic because they bypass the migration system entirely. Once manual changes exist, they create permanent drift that must be resolved. Preventing manual changes through process and access controls is crucial for maintaining alignment.

---

## Detection Strategies

### Migration State Comparison

The most reliable way to detect misalignment is comparing migration states between environments. The Supabase CLI provides commands to list applied migrations in local and remote environments. Comparing these lists reveals which migrations have been applied where, identifying drift.

Migration state comparison should be performed regularly, ideally as part of daily development workflows. Catching misalignment early makes resolution easier and prevents accumulation of drift. Automated checks can detect misalignment automatically and alert teams.

### Schema Diff Analysis

Beyond migration state, actual schema comparison reveals structural differences. The `supabase db diff` command compares database schemas and generates SQL showing differences. This comparison reveals tables, columns, or other elements that exist in one environment but not another.

Schema diff analysis is more comprehensive than migration state comparison because it reveals actual structural differences regardless of how they were created. This makes it valuable for detecting manual changes or migration application issues.

### Automated Alignment Checks

Teams can automate alignment checks using CI/CD pipelines or scheduled scripts. Automated checks compare migration states and schemas regularly, alerting teams when drift is detected. Automation ensures alignment is checked consistently and catches issues quickly.

Automated checks should be non-blocking for development but should alert teams to alignment issues. This balance allows development to continue while ensuring alignment problems are addressed promptly.

---

## Prevention Strategies

### Migration-Only Policy

The most effective alignment prevention is a strict migration-only policy: all schema changes must go through migrations, and manual changes are prohibited. This policy ensures all changes are tracked, versioned, and applied consistently across environments.

Enforcing migration-only policies requires access controls, process discipline, and team education. Database access should be restricted to prevent manual changes, and teams should understand why migrations are required. Process discipline ensures policies are followed consistently.

### Regular Synchronization

Regular synchronization keeps environments aligned by applying migrations consistently. Developers should reset local environments frequently, pulling latest migrations and ensuring local schemas match production. This regular synchronization prevents local drift.

Synchronization should be part of standard development workflows. Developers should synchronize when starting work, switching branches, or before creating new migrations. Making synchronization routine ensures alignment is maintained naturally.

### Version Control Discipline

Migrations must be committed to version control immediately after creation and before application to any environment. This discipline ensures migrations are tracked, reviewed, and available to all team members. Version control provides the single source of truth for schema changes.

Version control discipline also means migrations should never be modified after being applied to production. Once a migration is in production, it becomes part of history and shouldn't be changed. New migrations should be created for additional changes.

---

## Resolution Strategies

### Pull Production Schema

When local environments drift behind production, developers can pull the production schema locally. The `supabase db pull` command downloads the current production schema and generates migrations to bring local environments up to date. This approach synchronizes local to production.

Pulling production schemas is useful when production has changes that haven't been captured in migrations, or when local environments need to catch up. This approach treats production as the source of truth and brings local environments into alignment.

### Push Local Migrations

When local environments have migrations that haven't been applied to production, developers can push them using `supabase db push`. This command applies local migrations to remote databases, bringing production into alignment with local development.

Pushing migrations requires careful verification that migrations are correct and ready for production. Developers should test migrations thoroughly before pushing and follow production deployment procedures. This approach treats local development as the source of truth.

### Manual Reconciliation

Sometimes alignment requires manual reconciliation when schemas have diverged significantly or when manual changes exist. Manual reconciliation involves comparing schemas, identifying differences, creating migrations to resolve them, and applying those migrations systematically.

Manual reconciliation is complex and error-prone, so it should be avoided when possible. However, when necessary, careful reconciliation can restore alignment. Teams should document reconciliation processes to ensure they're performed correctly.

---

## Alignment Workflows

### Daily Development Workflow

Daily development workflows should include alignment checks. Developers should verify migration states when starting work, reset local environments regularly, and check for schema drift periodically. These routine checks maintain alignment naturally as part of development.

Daily workflows should be lightweight and non-disruptive. Quick checks that take seconds prevent alignment issues without slowing development. Making alignment checks routine ensures they happen consistently.

### Pre-Deployment Alignment

Before deploying migrations to production, teams must verify alignment. This verification ensures that production is in the expected state and that migrations will apply cleanly. Pre-deployment alignment checks prevent deployment issues and ensure smooth migrations.

Pre-deployment checks should compare migration states, verify schemas, and confirm that no manual changes exist. These checks provide confidence that deployments will succeed and help identify issues before they cause problems.

### Post-Deployment Verification

After deploying migrations, teams should verify that alignment is maintained. This verification confirms that migrations applied correctly, schemas match expectations, and environments remain aligned. Post-deployment verification provides confidence that deployments succeeded.

Verification should compare migration states and schemas between environments, confirming that deployments produced expected results. This verification catches deployment issues early and ensures alignment is maintained.

---

## Advanced Alignment Techniques

### Schema Versioning

Some teams implement explicit schema versioning systems that track schema versions independently of migrations. Version numbers provide quick alignment checks and help teams understand schema evolution. Versioning systems complement migration tracking and provide additional alignment verification.

Schema versioning requires discipline to maintain version numbers correctly, but provides valuable alignment information. Teams should decide whether versioning adds value for their specific needs and implement it if beneficial.

### Automated Alignment Scripts

Teams can create automated scripts that check alignment, generate reports, and even perform alignment operations. These scripts can be integrated into CI/CD pipelines or run on schedules, providing consistent alignment management with minimal manual effort.

Automated scripts should be well-tested and provide clear output about alignment status and any actions taken. Scripts enable teams to maintain alignment efficiently while reducing manual work and human error.

### Multi-Environment Alignment

Projects with multiple environments (local, staging, production) require alignment across all environments. Multi-environment alignment is more complex but follows the same principles: consistent migrations, regular synchronization, and alignment verification. Teams should establish processes that maintain alignment across all environments.

Multi-environment alignment requires coordination to ensure migrations are applied consistently everywhere. Teams should establish clear processes for which environments receive migrations when and in what order.

---

## Troubleshooting Misalignment

### Identifying Root Causes

When misalignment is detected, teams must identify root causes before attempting resolution. Root cause analysis determines whether misalignment resulted from manual changes, migration application issues, or other causes. Understanding root causes enables effective resolution.

Root cause analysis should examine migration history, schema differences, and any manual changes that might have occurred. This analysis provides complete understanding of how misalignment developed, enabling appropriate resolution strategies.

### Resolution Planning

After identifying root causes, teams must plan resolution carefully. Resolution plans should identify which environment is the source of truth, what migrations or changes are needed to restore alignment, and what risks exist in the resolution process. Careful planning ensures resolution succeeds safely.

Resolution plans should include rollback procedures in case resolution causes issues. Having rollback plans provides safety nets and enables confident resolution execution. Teams should test resolution procedures in staging before applying to production.

### Execution and Verification

Resolution execution follows planned procedures but requires real-time decision-making based on actual conditions encountered. Teams must execute resolutions carefully, verify each step, and confirm that alignment is restored. Careful execution ensures resolutions succeed and don't create new problems.

After resolution, teams must verify that alignment is restored and maintained. Verification confirms that schemas match, migration states align, and environments are synchronized. Ongoing verification ensures alignment persists after resolution.

---

## Best Practices

### Regular Checks

Regular alignment checks prevent drift accumulation and catch issues early. Teams should establish check frequencies appropriate for their development pace and project needs. More frequent checks catch issues sooner but require more effort.

### Clear Processes

Clear alignment processes ensure teams know how to maintain alignment and resolve issues. Processes should be documented, communicated, and followed consistently. Clear processes reduce confusion and ensure alignment is maintained effectively.

### Team Education

Team members must understand alignment importance and how to maintain it. Education ensures everyone follows processes, recognizes alignment issues, and knows how to resolve them. Ongoing education keeps alignment knowledge current as teams and tools evolve.

### Tool Utilization

Teams should leverage Supabase CLI tools effectively for alignment management. Understanding available tools and using them appropriately makes alignment maintenance easier and more reliable. Regular tool usage ensures teams stay familiar with alignment capabilities.

---

## Next Steps

After understanding alignment strategies, developers should:
1. Review troubleshooting guides (`../troubleshooting/01-common-issues.md`)
2. Learn advanced techniques (`../advanced/01-schema-diff-strategies.md`)
3. Study automated alignment (`../advanced/02-automated-alignment.md`)

---

**Related Files**:
- `01-local-development-workflow.md` - Local development
- `02-production-deployment-workflow.md` - Production procedures
- `../troubleshooting/01-common-issues.md` - Problem resolution
