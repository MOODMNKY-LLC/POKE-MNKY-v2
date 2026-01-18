# Local Development Workflow

**Category**: Workflows  
**Purpose**: Complete guide to working with Supabase databases in local development

---

## Introduction

Local development with Supabase enables developers to work with databases in isolated environments on their own machines. This workflow provides safety, speed, and flexibility that aren't possible when working directly with production databases. Mastering the local development workflow is essential for productive database development and safe migration creation.

---

## Initial Setup

### Starting the Local Stack

The local Supabase stack includes PostgreSQL, PostgREST, GoTrue (authentication), Storage, and other services, all running in Docker containers. Starting the stack is straightforward: `supabase start` initializes all services and makes them available locally. The first start may take several minutes as Docker downloads images and initializes containers.

After starting, the CLI displays connection information including database URLs, API endpoints, and service ports. Developers use these connection details to connect applications, database clients, and other tools to the local stack. The local stack runs on predictable ports, making it easy to configure development tools.

### Verifying Local Setup

After starting the local stack, developers should verify that all services are running correctly. The `supabase status` command displays the status of all services, their ports, and connection information. This verification ensures the local environment is ready for development work.

Developers should also test database connectivity using a database client or the `supabase db` commands. Successful connection confirms that the local database is accessible and ready for migrations and queries. This verification step catches configuration issues early.

---

## Working with Migrations Locally

### Creating New Migrations

When developers need to modify the database schema, they create new migration files using `supabase migration new <description>`. This command creates a new migration file with a timestamp-based filename in the `supabase/migrations/` directory. The description helps developers understand the migration's purpose when reviewing migration history.

Migration files are empty SQL files initially, ready for developers to add their schema changes. Developers write SQL statements to create tables, modify columns, add indexes, or perform any other schema modifications. Well-written migrations are focused, clear, and include comments explaining their purpose.

### Applying Migrations Locally

After creating a migration file, developers apply it to their local database using `supabase db reset` or `supabase migration up`. The reset command clears all data and reapplies all migrations from scratch, ensuring a clean state. The migration up command applies only pending migrations, preserving existing data.

Developers typically use reset during active development when they're creating and testing migrations. Reset provides a clean slate and ensures migrations work correctly from the beginning. Once migrations are stable, developers may use migration up to apply only new changes, preserving test data.

### Testing Migrations

Testing migrations locally is crucial before deploying to production. Developers should verify that migrations apply successfully, produce expected schema changes, and don't break existing functionality. Local testing catches syntax errors, logic mistakes, and compatibility issues before they reach production.

Testing should include both successful application and failure scenarios. Developers should verify that migrations handle edge cases, work with existing data, and can be rolled back if needed. Comprehensive local testing increases confidence in production deployments.

---

## Schema Development Patterns

### Incremental Development

Effective schema development follows incremental patterns: make small, focused changes rather than large, complex migrations. Incremental migrations are easier to understand, test, debug, and roll back. They also reduce risk by limiting the scope of each change.

Developers should create separate migrations for logically distinct changes, even if they're related. For example, creating a table and adding an index should be separate migrations. This separation provides flexibility and makes it easier to understand migration history.

### Iterative Refinement

Schema development is often iterative: developers create initial migrations, test them, discover issues, and refine them. Local development environments support this iteration by allowing frequent resets and rapid testing cycles. Developers should embrace iteration rather than trying to create perfect migrations on the first attempt.

Iterative refinement includes adjusting migration logic, improving error handling, and optimizing performance. Each iteration improves the migration and increases confidence in its correctness. This iterative approach is more effective than trying to design perfect migrations upfront.

### Data Seeding

Local development often requires seed data for testing. Supabase supports seed files in `supabase/seed.sql` that run after migrations during reset operations. Seed data helps developers test with realistic scenarios and ensures applications work with expected data structures.

Seed data should be representative but not excessive. Large seed files slow down reset operations and may not be necessary for all development scenarios. Developers should balance seed data comprehensiveness with reset speed and development needs.

---

## Common Local Development Tasks

### Inspecting Schema

Developers frequently need to inspect the current database schema to understand structure, verify changes, or plan modifications. The `supabase db diff` command compares the current database schema against migrations, showing what's actually in the database versus what migrations define.

Database clients also provide schema inspection capabilities through visual interfaces or SQL queries. Developers should become comfortable with both CLI and client-based inspection methods, as each has advantages for different scenarios.

### Modifying Existing Migrations

Sometimes developers need to modify migrations that haven't been deployed to production yet. Since migrations are just SQL files, developers can edit them directly. After modification, developers reset the local database to apply the updated migration and verify it works correctly.

Modifying migrations requires care: changes should be tested thoroughly, and developers must ensure the modified migration still produces the intended schema. This practice is safe for local development but should be avoided once migrations are deployed to production.

### Debugging Migration Issues

When migrations fail or produce unexpected results, developers need debugging strategies. The CLI provides error messages that help identify issues, and database clients allow inspection of actual schema state. Developers should compare expected versus actual states to identify problems.

Debugging often involves checking migration SQL syntax, verifying dependencies between migrations, and examining database state before and after migration application. Systematic debugging approaches help identify root causes and develop fixes.

---

## Integration with Application Development

### Application Connection

Applications connect to local Supabase using connection strings provided by `supabase status`. These connection strings point to local services running in Docker containers. Applications typically use environment variables to switch between local and production connections based on environment.

Developers should configure applications to use local Supabase during development, ensuring they're testing against local databases rather than accidentally connecting to production. This configuration prevents accidental production modifications and ensures proper local development workflow.

### Testing Application Changes

Local databases enable comprehensive testing of application changes that depend on schema modifications. Developers can test new features, verify data access patterns, and validate application behavior with local databases. This testing ensures applications work correctly with new schemas before production deployment.

Testing should include both happy paths and error scenarios. Developers should verify that applications handle new schema features correctly and gracefully handle edge cases. Comprehensive testing increases confidence in production deployments.

### Data Management

Local development requires managing test data effectively. Developers may create seed files, use database clients to insert test data, or write scripts to generate realistic datasets. Effective data management ensures developers can test with appropriate scenarios without spending excessive time on data setup.

Test data should be representative of production data characteristics while respecting privacy and security requirements. Developers shouldn't copy production data to local environments; instead, they should create synthetic data that mirrors production characteristics.

---

## Workflow Best Practices

### Regular Resets

Developers should reset local databases regularly to ensure they're working with current migrations and clean states. Regular resets prevent local environments from drifting and ensure migrations work correctly from the beginning. Frequent resets are a sign of healthy local development practices.

Resets are fast operations in local environments, so there's little cost to resetting frequently. The benefits of clean states and current migrations outweigh the minor time cost of reset operations.

### Migration Organization

Migrations should be organized logically with clear naming and focused purposes. Well-organized migrations are easier to understand, review, and maintain. Developers should follow consistent naming conventions and include descriptive comments in migration files.

Migration organization also includes grouping related changes and separating unrelated modifications. This organization makes migration history more understandable and helps developers navigate complex schema evolution.

### Version Control Integration

Migrations are SQL files that belong in version control alongside application code. Developers should commit migrations frequently, write clear commit messages, and review migrations in pull requests just like code changes. Version control integration ensures migrations are tracked, reviewed, and can be rolled back if needed.

Version control also enables collaboration: multiple developers can work on schema changes, and migrations can be merged and coordinated through standard git workflows. This integration makes database development collaborative and manageable.

---

## Troubleshooting Local Issues

### Service Startup Problems

Sometimes local Supabase services fail to start, often due to port conflicts, Docker issues, or resource constraints. Developers should check Docker status, verify port availability, and ensure sufficient system resources. The CLI provides error messages that help diagnose startup problems.

Common solutions include stopping conflicting services, freeing up ports, restarting Docker, or allocating more resources to Docker. Understanding these common issues helps developers resolve problems quickly and maintain productive development workflows.

### Migration Application Failures

Migration failures in local environments are learning opportunities. Developers should read error messages carefully, understand what went wrong, and fix migration issues. Local failures are safe and provide valuable feedback before production deployment.

When migrations fail, developers should check SQL syntax, verify dependencies, and examine database state. Systematic debugging approaches help identify and fix issues efficiently. Learning from local failures prevents similar issues in production.

### Data Persistence Issues

Local databases are ephemeral by design, but sometimes developers need data to persist between resets. Understanding when data persists (between migrations) versus when it's cleared (during resets) helps developers work effectively with local environments.

Developers can use seed files or migration-based data insertion to ensure important test data is available after resets. Understanding data persistence helps developers maintain useful local development environments.

---

## Advanced Local Development

### Custom Seed Scripts

Beyond basic seed files, developers can create custom seed scripts that generate complex test data, set up specific scenarios, or perform advanced data setup. These scripts run after migrations and provide flexible data management for local development.

Custom seed scripts should be idempotent and well-documented. They enable sophisticated local testing scenarios and help developers work with realistic data without manual setup.

### Multiple Local Projects

Developers working on multiple projects may need to manage multiple local Supabase instances. The CLI supports this through project-specific configurations and the ability to start and stop different projects independently. Understanding multi-project management helps developers work efficiently across projects.

Each project maintains its own Docker containers, migrations, and state. Developers can switch between projects by stopping one and starting another, or by running multiple instances on different ports.

### Performance Testing Locally

While local environments don't match production performance, developers can still perform basic performance testing locally. Understanding local performance characteristics helps developers identify potential production issues early and design migrations with performance in mind.

Local performance testing should focus on identifying obvious performance problems rather than precise benchmarking. Production-like performance testing requires staging environments with production-scale data.

---

## Next Steps

After mastering local development workflows, developers should:
1. Learn production deployment procedures (`02-production-deployment-workflow.md`)
2. Study alignment strategies (`03-alignment-strategies.md`)
3. Review troubleshooting guides (`../troubleshooting/01-common-issues.md`)

---

**Related Files**:
- `02-production-deployment-workflow.md` - Production procedures
- `03-alignment-strategies.md` - Keeping environments aligned
- `../fundamentals/01-supabase-cli-overview.md` - CLI fundamentals
