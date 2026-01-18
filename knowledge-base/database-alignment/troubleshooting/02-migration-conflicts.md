# Migration Conflicts

**Category**: Troubleshooting  
**Purpose**: Resolving conflicts when multiple migrations or schema changes collide

---

## Introduction

Migration conflicts occur when multiple schema changes interfere with each other, when migrations are applied in conflicting orders, or when manual changes conflict with migration-based changes. Understanding conflict types, detection methods, and resolution strategies is essential for maintaining database alignment and successful deployments.

---

## Conflict Types

### Timestamp Conflicts

When multiple developers create migrations simultaneously, they may generate migrations with identical or very close timestamps. Timestamp conflicts cause ambiguity in migration ordering, potentially leading to incorrect application order and schema inconsistencies. These conflicts are common in collaborative development environments.

Timestamp conflicts are typically resolved through git merge processes where developers coordinate to adjust timestamps and ensure correct ordering. The migration system relies on filename ordering, so even small timestamp differences can cause ordering issues if not handled carefully.

### Dependency Conflicts

Dependencies between migrations can conflict when migrations reference schema elements in ways that create circular dependencies or when dependency order is ambiguous. For example, Migration A might create a table that Migration B references, while Migration B creates a constraint that Migration A needs. These circular dependencies prevent clean application.

Dependency conflicts require restructuring migrations to establish clear dependency chains. This might involve breaking migrations into smaller pieces, reordering operations, or creating intermediate migrations that establish dependencies before they're used.

### Schema State Conflicts

When migrations assume different starting schema states, conflicts can occur during application. For example, one migration might assume a column exists while another assumes it doesn't, or migrations might make incompatible assumptions about data types or constraints. These state conflicts cause migration failures.

State conflicts require ensuring migrations are compatible with actual database states. This might involve verifying current states before migration application, making migrations more robust to handle different states, or creating migrations that establish required states before dependent operations.

---

## Detection Methods

### Migration State Analysis

Comparing migration states between environments reveals conflicts by showing which migrations have been applied where and in what order. State analysis identifies when environments have diverged and when migration orders differ. This analysis is the first step in conflict detection.

Migration state comparison should be performed regularly to catch conflicts early. Early detection makes resolution easier and prevents conflicts from accumulating. Automated state comparison can detect conflicts automatically and alert teams.

### Schema Diff Comparison

Comparing actual database schemas reveals structural conflicts that migration state analysis might miss. Schema diffs show what's actually in databases versus what migrations define, revealing conflicts between manual changes and migrations or between different migration application orders.

Schema diff analysis is more comprehensive than migration state analysis because it reveals actual structural differences regardless of how they were created. This makes it valuable for detecting conflicts that migration tracking might miss.

### Application Failure Analysis

When migrations fail during application, error messages often indicate conflicts. Analyzing failure messages reveals what conflicts exist and why migrations failed. Failure analysis provides specific information about conflicts that helps guide resolution.

Failure analysis should examine error messages carefully, understand what operations failed, and identify what conflicts caused failures. This analysis provides actionable information for conflict resolution.

---

## Resolution Strategies

### Timestamp Adjustment

When timestamp conflicts occur, developers can adjust migration timestamps to ensure correct ordering. This adjustment typically happens during git merges where developers coordinate to establish correct order. Timestamp adjustment is straightforward but requires coordination.

Adjusting timestamps should maintain logical ordering based on dependencies, not just arbitrary timestamp differences. Developers should understand migration dependencies and ensure timestamps reflect dependency order. This ensures migrations apply correctly regardless of timestamp values.

### Migration Restructuring

Complex conflicts may require restructuring migrations to resolve dependencies or state assumptions. Restructuring might involve breaking large migrations into smaller pieces, reordering operations, or creating intermediate migrations. This approach resolves conflicts by making migrations compatible.

Restructuring requires understanding migration purposes and dependencies. Developers should ensure restructured migrations maintain intended functionality while resolving conflicts. Careful restructuring preserves migration intent while enabling successful application.

### Conflict Resolution Migrations

Some conflicts can be resolved by creating new migrations that reconcile differences. Resolution migrations bridge gaps between conflicting states, establishing compatible states that allow subsequent migrations to apply. This approach resolves conflicts without modifying existing migrations.

Resolution migrations should be designed carefully to handle all conflict scenarios and establish states that enable continued migration application. These migrations are temporary bridges that resolve conflicts and restore migration compatibility.

---

## Prevention Strategies

### Coordination Processes

Establishing coordination processes prevents conflicts by ensuring developers communicate about schema changes and coordinate migration creation. Coordination might involve migration planning sessions, communication channels for schema changes, or review processes that catch conflicts before they're committed.

Coordination processes should be lightweight enough to not slow development but effective enough to prevent conflicts. Finding the right balance ensures processes add value without becoming burdensome. Regular coordination prevents most conflicts naturally.

### Dependency Documentation

Documenting migration dependencies helps developers understand relationships and avoid creating conflicting migrations. Dependency documentation should identify what each migration depends on and what depends on it, creating clear dependency graphs that guide migration creation.

Dependency documentation should be maintained as migrations are created and updated as dependencies change. Keeping documentation current ensures it remains useful for preventing conflicts. Well-maintained documentation helps teams understand migration relationships.

### Automated Conflict Detection

Automated systems can detect potential conflicts before they cause problems. Conflict detection might analyze migration dependencies, check for timestamp conflicts, or verify schema compatibility. Early detection enables proactive resolution before conflicts cause issues.

Automated detection should be integrated into development workflows, checking for conflicts during migration creation or before commits. This integration ensures conflicts are caught early when resolution is easiest. Effective automation prevents conflicts from reaching production.

---

## Complex Conflict Scenarios

### Multi-Developer Conflicts

When multiple developers work on schema changes simultaneously, conflicts are almost inevitable. Multi-developer conflicts require coordination, communication, and sometimes conflict resolution sessions where teams work together to resolve issues. These conflicts are common in collaborative environments.

Resolution typically involves git merge processes, migration restructuring, and team coordination. Developers should communicate about schema changes, review each other's migrations, and coordinate to prevent conflicts. Good communication prevents most multi-developer conflicts.

### Production Drift Conflicts

When production databases have manual changes that conflict with migrations, resolution is complex. Production drift conflicts require capturing manual changes in migrations, reconciling differences, and ensuring migrations are compatible with production states. These conflicts are particularly challenging because production can't be easily modified.

Resolution involves using `supabase db pull` to capture production schema, generating migrations from differences, and ensuring those migrations are compatible with existing migrations. This process reconciles production drift with migration-based development.

### Historical Migration Conflicts

Sometimes conflicts involve migrations that were applied in the past, creating historical inconsistencies. Historical conflicts are difficult to resolve because they involve migration history that can't be easily changed. These conflicts require careful analysis and sometimes migration history reconstruction.

Resolution might involve creating new migrations that reconcile historical differences, documenting historical conflicts, or in extreme cases, reconstructing migration history. Historical conflicts are complex and require careful handling to maintain migration integrity.

---

## Best Practices

### Early Detection

Detecting conflicts early makes resolution easier and prevents problems from accumulating. Teams should check for conflicts regularly, ideally as part of standard development workflows. Early detection enables quick resolution before conflicts become complex.

### Clear Communication

Clear communication about schema changes prevents conflicts by ensuring developers understand what others are working on. Communication should include migration purposes, dependencies, and timelines. Good communication prevents most conflicts naturally.

### Systematic Resolution

Resolving conflicts systematically ensures they're resolved correctly and completely. Systematic approaches involve understanding conflict causes, planning resolution steps, executing resolutions carefully, and verifying that conflicts are resolved. Systematic resolution prevents partial fixes that cause additional problems.

### Documentation

Documenting conflicts and resolutions helps teams learn and prevents similar conflicts in the future. Documentation should include conflict causes, resolution approaches, and lessons learned. Good documentation improves team understanding and prevents recurrence.

---

## Next Steps

After understanding migration conflicts, developers should:
1. Review recovery procedures (`03-recovery-procedures.md`)
2. Study advanced techniques (`../advanced/01-schema-diff-strategies.md`)
3. Learn automated alignment (`../advanced/02-automated-alignment.md`)

---

**Related Files**:
- `01-common-issues.md` - General troubleshooting
- `03-recovery-procedures.md` - Recovery strategies
- `../workflows/03-alignment-strategies.md` - Alignment maintenance
