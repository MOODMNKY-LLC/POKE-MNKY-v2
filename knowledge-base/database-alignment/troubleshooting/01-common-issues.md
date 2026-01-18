# Common Issues and Solutions

**Category**: Troubleshooting  
**Purpose**: Resolving frequently encountered database alignment problems

---

## Introduction

Database alignment issues are common in development workflows, arising from various causes including manual changes, migration application problems, environment drift, and configuration issues. This guide provides solutions for the most frequently encountered problems, helping teams resolve issues quickly and maintain productive development workflows.

---

## Migration Application Failures

### Syntax Errors in Migrations

SQL syntax errors prevent migrations from applying, typically showing clear error messages indicating the problem location. These errors are usually straightforward to fix: review the error message, correct the SQL syntax, and reapply the migration. Syntax errors are common during initial migration development and are easily resolved.

Prevention involves testing migrations locally before production deployment and using SQL linters or validators. Catching syntax errors early prevents deployment failures and saves time. Local testing environments are perfect for identifying and fixing syntax issues.

### Dependency Violations

Migrations sometimes fail because they depend on schema elements that don't exist yet. For example, adding a foreign key constraint fails if the referenced table hasn't been created. These dependency violations indicate migration ordering problems or missing migrations.

Resolution requires ensuring migrations are applied in correct order and that all dependencies exist before they're referenced. Migration ordering is critical: dependencies must be created before they're used. Reviewing migration dependencies and ensuring correct ordering resolves these issues.

### Constraint Violations

Migrations involving data modifications may fail due to constraint violations. For example, adding a NOT NULL constraint fails if existing rows have NULL values. These violations indicate that migrations don't account for existing data states.

Resolution requires modifying migrations to handle existing data appropriately. This might involve data cleanup before adding constraints, using default values, or making constraints nullable initially then tightening them later. Understanding existing data states is crucial for designing migrations that succeed.

---

## Schema Drift Issues

### Manual Changes in Production

Manual schema changes in production create permanent drift that migrations don't capture. This drift causes local and production schemas to diverge, breaking alignment. Manual changes are problematic because they bypass the migration system entirely.

Resolution requires capturing manual changes in new migrations and applying those migrations to local environments. The `supabase db pull` command can help generate migrations from production schema differences. Prevention involves access controls and process discipline to prevent manual changes.

### Migration Application Order Mismatches

When migrations are applied in different orders between environments, schemas can diverge even if the same migrations are applied. Order mismatches typically occur when multiple developers create migrations simultaneously or when migrations are applied manually in wrong order.

Resolution requires ensuring migrations are applied in consistent order everywhere. Migration filenames use timestamps to ensure ordering, but manual application can still cause order issues. Using CLI commands for migration application ensures correct ordering automatically.

### Missing Migrations

Sometimes migrations exist locally but haven't been applied to production, or vice versa. Missing migrations cause schema differences and break alignment. This typically occurs when migrations aren't deployed or when local environments aren't updated.

Resolution requires identifying missing migrations and applying them to the appropriate environments. Migration state comparison reveals which migrations are missing where. Applying missing migrations restores alignment, but requires careful verification to ensure they apply correctly.

---

## Connection and Configuration Issues

### Database Connection Failures

Connection failures prevent migration application and schema operations. These failures typically result from incorrect connection strings, network issues, authentication problems, or service unavailability. Connection issues are usually straightforward to diagnose through error messages.

Resolution involves verifying connection strings, checking network connectivity, confirming authentication credentials, and ensuring services are running. Connection issues are often configuration problems that are easily fixed once identified. Local environments require Docker to be running, while remote connections require valid credentials.

### Environment Configuration Mismatches

Configuration mismatches between environments can cause migrations to behave differently or fail unexpectedly. These mismatches might involve PostgreSQL versions, extension availability, or environment-specific settings. Configuration differences can cause subtle issues that are hard to diagnose.

Resolution requires ensuring consistent configurations across environments. Supabase CLI helps maintain consistency, but teams should verify configurations match. Understanding configuration requirements and ensuring environments are configured identically prevents these issues.

### Migration Tracking Table Issues

The `schema_migrations` table that tracks applied migrations can become corrupted or inconsistent, causing migration system failures. This might occur due to manual modifications, failed migrations, or system issues. Tracking table problems prevent migration application and state verification.

Resolution requires repairing the tracking table to reflect actual migration state. This might involve manually updating the table or recreating it based on actual schema state. Careful repair ensures migration tracking works correctly without losing history.

---

## Data-Related Problems

### Data Type Mismatches

Migrations that change data types can fail if existing data isn't compatible with new types. For example, changing a text column to integer fails if text values can't be converted to integers. These mismatches indicate that migrations don't account for existing data characteristics.

Resolution requires data transformation migrations that convert existing data before type changes. These transformations ensure data compatibility with new types. Understanding existing data and designing appropriate transformations resolves these issues.

### Foreign Key Constraint Issues

Adding foreign key constraints can fail if referenced data doesn't exist or if existing data violates referential integrity. These issues indicate that migrations don't account for data relationships and integrity requirements.

Resolution requires ensuring referenced data exists before adding constraints, or cleaning up invalid references. Data integrity must be established before constraints are added. Understanding data relationships and ensuring integrity before constraint addition resolves these issues.

### Index Creation Failures

Creating indexes on large tables can fail due to timeouts, lock conflicts, or resource constraints. These failures are particularly common in production environments with large datasets. Index creation requires careful planning for large tables.

Resolution involves creating indexes during maintenance windows, using concurrent index creation when available, or breaking large index operations into smaller steps. Understanding index creation requirements and planning appropriately prevents these failures.

---

## Performance and Locking Issues

### Long-Running Migrations

Some migrations take significant time to execute, especially those involving large data transformations or index creation. Long-running migrations can cause deployment windows to exceed available time or cause system performance issues.

Resolution involves optimizing migrations for performance, breaking large operations into smaller steps, or scheduling migrations during extended maintenance windows. Performance optimization might involve batch processing, parallel operations, or more efficient algorithms.

### Lock Conflicts

Migrations that acquire table locks can block application operations, causing service disruptions. Lock conflicts are particularly problematic in production environments where applications must remain available. Understanding lock behavior and minimizing lock duration is crucial.

Resolution involves using lock-free migration techniques when possible, scheduling migrations during low-traffic periods, or using online migration tools that minimize locking. Some PostgreSQL features enable schema changes without exclusive locks, which should be used when available.

### Resource Exhaustion

Large migrations can exhaust database resources like disk space, memory, or connection limits. Resource exhaustion causes migration failures and can impact system stability. These issues are particularly common with data-heavy migrations.

Resolution requires monitoring resource usage, planning migrations to stay within resource limits, and scaling resources if necessary. Understanding resource requirements and planning migrations accordingly prevents exhaustion issues.

---

## Recovery Procedures

### Partial Migration Failures

When migrations fail partway through, databases can be left in inconsistent states. Partial failures require careful recovery to restore consistency without losing data or causing additional problems. Recovery procedures depend on whether migrations ran in transactions.

Resolution involves understanding what succeeded before failure, determining safe recovery steps, and executing recovery carefully. Transactional migrations provide automatic rollback, but non-transactional migrations require manual recovery. Understanding migration transaction behavior is crucial for recovery.

### Rollback Execution

Rolling back migrations requires careful execution to restore previous states without data loss. Rollback procedures must account for data changes, dependent migrations, and system state. Poorly executed rollbacks can cause additional problems.

Resolution requires well-planned rollback procedures that are tested in staging environments. Rollback plans should identify affected data, required steps, and verification procedures. Testing rollbacks ensures they work correctly when needed.

### State Restoration

Sometimes databases must be restored to previous states using backups. Restoration procedures must ensure backups are valid, restoration processes work correctly, and restored states are verified. Restoration is typically a last resort but may be necessary for severe issues.

Resolution involves having tested backup and restoration procedures, valid backups available, and clear restoration plans. Regular backup testing ensures restoration works when needed. Understanding restoration procedures and having them ready enables quick recovery.

---

## Prevention Strategies

### Comprehensive Testing

Thorough testing prevents many common issues by catching problems before production deployment. Testing should include migration application, schema verification, data integrity checks, and performance validation. Comprehensive testing provides confidence and prevents issues.

### Process Discipline

Following established processes consistently prevents issues caused by shortcuts or deviations. Process discipline ensures migrations are reviewed, tested, and applied correctly. Clear processes and team adherence prevent many common problems.

### Monitoring and Alerting

Monitoring migration applications and database health provides early warning of issues. Alerting systems notify teams when problems occur, enabling quick response. Effective monitoring catches issues early and prevents them from becoming serious problems.

### Documentation

Well-documented migrations, procedures, and recovery plans help teams resolve issues quickly. Documentation should include migration purposes, expected behaviors, known issues, and resolution procedures. Good documentation enables effective troubleshooting and problem resolution.

---

## Getting Help

### Diagnostic Information

When seeking help with issues, providing comprehensive diagnostic information enables effective assistance. This includes error messages, migration files, schema states, and steps to reproduce problems. Complete information helps identify root causes quickly.

### Community Resources

Supabase community resources provide valuable assistance for common issues. Forums, documentation, and community support can help resolve problems. Understanding available resources and how to use them effectively enables problem resolution.

### Escalation Procedures

For critical issues or problems that can't be resolved through standard procedures, teams should have escalation procedures. Escalation ensures issues receive appropriate attention and expertise. Clear escalation procedures enable effective problem resolution.

---

## Next Steps

After resolving issues, developers should:
1. Review migration conflicts guide (`02-migration-conflicts.md`)
2. Study recovery procedures (`03-recovery-procedures.md`)
3. Learn advanced troubleshooting (`../advanced/01-schema-diff-strategies.md`)

---

**Related Files**:
- `02-migration-conflicts.md` - Conflict resolution
- `03-recovery-procedures.md` - Recovery strategies
- `../workflows/03-alignment-strategies.md` - Alignment maintenance
