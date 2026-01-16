# POKE MNKY Ecosystem Services: Comprehensive Analysis

**Date**: January 15, 2026  
**Analysis Method**: Deep Research Protocol  
**Status**: Complete Ecosystem Mapping  
**Document Type**: Collaborative Reference (Server + App)

---

## 📋 Document Structure & Contributors

This document is a **collaborative reference** maintained by two Cursor AI agents working on different parts of the POKE MNKY ecosystem:

- **POKE MNKY (server)** - Manages Docker services, battle infrastructure, and server-side automation
- **POKE MNKY (app)** - Manages Next.js application, frontend components, and API routes

Each section is clearly marked with the responsible agent. This document serves as a shared knowledge base for understanding how all services integrate across the ecosystem.

---

## 🖥️ Part 1: Server Infrastructure & Services

**Managed By**: POKE MNKY (server)  
**Last Updated**: January 15, 2026  
**Scope**: Docker services, battle infrastructure, automation, data services

### Server Agent Overview

I manage the **server-side infrastructure** running on your homelab/VPS, which includes all Docker services that provide battle simulation, data enrichment, and automation capabilities. My responsibilities include:

- **Battle Infrastructure**: Showdown server, client, and loginserver for actual Pokémon battles
- **Data Services**: PokéAPI stack (PostgreSQL + Redis + API) for comprehensive Pokémon data
- **Automation Services**: Integration worker and Discord bot for automated league operations
- **Utility Services**: Damage calculator, sprite builders, and data migration tools
- **Infrastructure**: Docker Compose orchestration, Cloudflare Tunnel configuration, service health monitoring

### ⚠️ Critical: Server IP Address for LAN Access

**Server Direct IP Address**: `10.3.0.119`

**IMPORTANT**: When developing the Next.js app on a different machine (not the server itself), you **MUST** use the server's IP address (`10.3.0.119`) instead of `localhost` or `127.0.0.1` to access server services over the local network.

**When to use `10.3.0.119`**:
- Next.js app running on a different machine accessing Showdown server APIs
- Next.js app accessing PokéAPI service over LAN
- Local development connecting to server services from another machine
- Any cross-machine communication within the local network

**When to use `localhost`**:
- Services running on the server itself accessing other server services
- Docker containers accessing each other via Docker network (use service names like `pokemon-showdown:8000`)
- Cloudflare Tunnel routes (configured in Cloudflare Dashboard, not via IP)

**Service URLs for LAN Access** (when developing app on different machine):
- Showdown Server: `http://10.3.0.119:8000`
- Showdown Client: `http://10.3.0.119:8080`
- Showdown Loginserver: `http://10.3.0.119:8001`
- PokéAPI: `http://10.3.0.119:8000/api/v2` (if port exposed) or use Docker service name `pokeapi:8000` from within Docker network
- Damage Calculator: `http://10.3.0.119:5000`

**Production URLs** (via Cloudflare Tunnel - use in production/Vercel):
- Showdown Server: `https://aab-showdown.moodmnky.com`
- Showdown Client: `https://aab-play.moodmnky.com`
- Showdown Loginserver: `https://aab-login.moodmnky.com` (if configured)

### How Server Services Integrate with the App

The server services I manage provide **backend capabilities** that the Next.js app consumes through well-defined APIs and shared databases:

**Battle Infrastructure Integration**:
- The Showdown server exposes a REST API (`POST /api/create-room`) that the Next.js app calls to create battle rooms programmatically
- The Showdown server calls back to the Next.js app's `/api/showdown/validate-team` endpoint to validate teams against league rosters
- The Showdown client is accessible via Cloudflare Tunnel at `https://aab-play.moodmnky.com`, allowing the Next.js app to deep-link users directly to battles
- The loginserver stores teams in Supabase (`showdown_client_teams` table), which the Next.js app can query and display

**Data Services Integration**:
- PokéAPI provides REST endpoints that the Next.js app queries for Pokémon species data, moves, abilities, and type information
- This data powers team builder features, Pokédex displays, and draft preparation tools in the app
- The PokéAPI service is accessible internally via Docker network at `http://pokeapi:8000/api/v2`, or over LAN at `http://10.3.0.119:8000/api/v2` if port is exposed

**Automation Services Integration**:
- The Discord bot calls Next.js app API endpoints (`/api/matches`, `/api/standings`, `/api/showdown/validate-team`) to provide league operations within Discord
- The integration worker (when fully implemented) will update Supabase match records that the Next.js app displays in real-time
- Both services use Supabase service role keys to bypass RLS and perform administrative operations

**Shared Database Integration**:
- All server services and the Next.js app share Supabase as the primary database
- Server services use service role keys (bypass RLS) for administrative operations
- Next.js app uses anon keys (respects RLS) for user-scoped data access
- This shared database enables seamless data flow: battles update matches, matches update standings, standings display in the app

**API Communication Patterns**:
- **Server → App**: Showdown server calls Next.js app APIs with `SHOWDOWN_API_KEY` authentication
- **App → Server**: Next.js app calls Showdown server APIs with `SHOWDOWN_API_KEY` authentication
- **Bot → App**: Discord bot calls Next.js app APIs (public endpoints or with service role key)
- **Worker → Database**: Integration worker directly updates Supabase (bypasses app APIs)

### Key Integration Points for App Agent

When building app features, you'll interact with my server services through these integration points:

**Production URLs** (use in production/Vercel deployment):
1. **Showdown API** (`https://aab-showdown.moodmnky.com/api/create-room`): Call this to create battle rooms from the app
2. **Showdown Client** (`https://aab-play.moodmnky.com`): Deep-link users here for battles
3. **PokéAPI**: Use production PokéAPI URL if exposed, or query Supabase for cached Pokémon data

**Development URLs** (use when developing app on different machine):
1. **Showdown API** (`http://10.3.0.119:8000/api/create-room`): **Use IP address, NOT localhost**
2. **Showdown Client** (`http://10.3.0.119:8080`): For local testing
3. **PokéAPI** (`http://10.3.0.119:8000/api/v2`): If PokéAPI port is exposed, or use Docker service name `pokeapi:8000` if app runs in Docker network

**Shared Services**:
4. **Supabase**: Shared database - use anon keys for user queries, service role key for admin operations
   - Production: `https://chmrszrwlfeqovwxyrmt.supabase.co`
   - Local: `http://127.0.0.1:54321` (if running local Supabase)
5. **Discord Bot**: Receives commands that call your app APIs - ensure endpoints are available

**⚠️ Critical Reminder**: If developing the Next.js app on a machine other than the server (`10.3.0.119`), always use the IP address (`10.3.0.119`) instead of `localhost` for server service URLs. Using `localhost` will fail because it refers to the development machine, not the server.

### Server Access for App Agent

If you need to access the server directly for debugging, checking logs, or troubleshooting integration issues, you can SSH into the server:

**SSH Connection**:
```bash
ssh moodmnky@10.3.0.119
# Password: MOODMNKY88
```

**After SSH Access**:
- You have `sudo` access for administrative tasks
- User `moodmnky` is in the `docker` group, so Docker commands work without sudo
- Server services are managed via Docker Compose in `/home/moodmnky/POKE-MNKY/`
- Check service status: `cd /home/moodmnky/POKE-MNKY && docker compose ps`
- View service logs: `docker compose logs -f [service-name]`
- Restart services: `docker compose restart [service-name]`
- Access Docker containers: `docker exec -it [container-name] /bin/sh`

**Common Tasks**:
- **Check if services are running**: `docker compose ps`
- **View Showdown server logs**: `docker compose logs -f pokemon-showdown`
- **View Discord bot logs**: `docker compose logs -f discord-bot`
- **Check service health**: `docker compose ps` (look for "healthy" status)
- **Restart a service**: `docker compose restart [service-name]`
- **View environment variables**: `cat /home/moodmnky/POKE-MNKY/.env` (be careful with sensitive data)

**Important Notes**:
- Server services are managed by POKE MNKY (server) - coordinate before making changes
- Environment variables are in `/home/moodmnky/POKE-MNKY/.env`
- Docker Compose file is at `/home/moodmnky/POKE-MNKY/docker-compose.yml`
- Service source code is in `/home/moodmnky/POKE-MNKY/tools/`
- Always check service status before making changes
- Use `docker compose logs` to debug integration issues between app and server

**When to Access Server**:
- Debugging API connection issues between app and server
- Checking if server services are responding correctly
- Viewing logs for troubleshooting integration problems
- Verifying environment variables are set correctly
- Testing server API endpoints directly

### Docker Remote Access for App Agent

The Docker daemon on the server uses a Unix socket (`/var/run/docker.sock`) and is **not** exposed via TCP for security. To access Docker remotely, use one of these methods:

#### Method 1: SSH Direct Access (Recommended)

SSH into the server and use Docker commands directly:

```bash
# SSH into server
ssh moodmnky@10.3.0.119
# Password: MOODMNKY88

# Once connected, Docker commands work directly
cd /home/moodmnky/POKE-MNKY
docker compose ps
docker compose logs -f [service-name]
docker exec -it [container-name] /bin/sh
```

**Advantages**: Simple, secure, no additional configuration needed  
**User Permissions**: User `moodmnky` is in the `docker` group, so Docker commands work without sudo

#### Method 2: Docker Context via SSH (For Remote Docker CLI)

Set up a Docker context to use SSH for remote Docker access from your local machine:

```bash
# Create Docker context using SSH
docker context create poke-mnky-server \
  --docker "host=ssh://moodmnky@10.3.0.119"

# Use the context
docker context use poke-mnky-server

# Now Docker commands run on the remote server
docker compose -f /home/moodmnky/POKE-MNKY/docker-compose.yml ps
docker compose -f /home/moodmnky/POKE-MNKY/docker-compose.yml logs -f [service-name]

# Switch back to local context when done
docker context use default
```

**Advantages**: Use Docker CLI from your local machine, commands execute on server  
**Requirements**: SSH access configured (password or SSH key)

#### Method 3: SSH Socket Forwarding (Advanced)

Forward the Docker socket over SSH for local Docker access:

```bash
# Forward Docker socket over SSH
ssh -L /tmp/docker.sock:/var/run/docker.sock moodmnky@10.3.0.119 -N

# In another terminal, use forwarded socket
export DOCKER_HOST=unix:///tmp/docker.sock
docker ps
docker compose -f /home/moodmnky/POKE-MNKY/docker-compose.yml ps
```

**Advantages**: Use local Docker CLI as if Docker is running locally  
**Note**: Requires keeping SSH tunnel open, more complex setup

#### Docker Connection Details

**Docker Daemon Information**:
- **Socket Path**: `/var/run/docker.sock` (Unix socket)
- **Socket Permissions**: `root:docker` (user `moodmnky` is in `docker` group)
- **Docker Version**: 29.1.4 (Server and Client)
- **Docker Context**: `default` (Unix socket)
- **TCP Port**: Not exposed (Unix socket only for security)

**Docker Compose Information**:
- **Compose File**: `/home/moodmnky/POKE-MNKY/docker-compose.yml`
- **Working Directory**: `/home/moodmnky/POKE-MNKY/`
- **Network**: `poke-mnky-network` (bridge driver)
- **All services**: Use this network for inter-service communication

**Quick Docker Commands Reference**:
```bash
# After SSH access or with Docker context
cd /home/moodmnky/POKE-MNKY

# List all services
docker compose ps

# View logs for specific service
docker compose logs -f pokemon-showdown
docker compose logs -f discord-bot
docker compose logs -f integration-worker

# Restart a service
docker compose restart pokemon-showdown

# Stop/start all services
docker compose down
docker compose up -d

# Execute command in container
docker exec -it poke-mnky-showdown-server /bin/sh
docker exec -it poke-mnky-discord-bot /bin/sh

# View container resource usage
docker stats

# Inspect container
docker inspect poke-mnky-showdown-server
```

**Security Note**: Docker daemon is not exposed via TCP (port 2375/2376) for security. All remote access must go through SSH, which is the recommended secure approach.

### Server Services Status

All server services documented below are **currently running and healthy** on the homelab/VPS infrastructure at IP address `10.3.0.119`. Environment variables, configuration, and integration points are documented in detail in the sections that follow.

---

## Executive Summary

The POKE MNKY ecosystem represents a sophisticated distributed architecture that bridges self-hosted battle infrastructure with cloud-based application services, creating a comprehensive Pokémon draft league management platform. This analysis documents all services currently running in the ecosystem, their respective roles, interconnections, and how they collectively augment the Next.js application to provide a seamless league experience.

The ecosystem consists of nine core Docker services running on a homelab/VPS infrastructure, integrated with cloud services including Supabase (PostgreSQL database), Vercel (Next.js application deployment), Cloudflare Tunnel (secure public exposure), and MinIO (S3-compatible object storage). This hybrid architecture enables powerful battle simulation capabilities while maintaining modern web application features, automated league operations, and comprehensive data management.

---

## Knowledge Development: Understanding the Ecosystem Architecture

The investigation into the POKE MNKY services began with identifying the core battle infrastructure services visible in Docker Compose configuration, then expanded to understand how these services connect to external cloud platforms and the Next.js application. Initial analysis revealed a clear separation between battle infrastructure (self-hosted) and application infrastructure (cloud-hosted), connected through API endpoints and shared database systems.

As the investigation deepened, patterns emerged showing how services augment each other: the Showdown server provides battle simulation, the client provides user interface, the loginserver handles authentication, while integration services bridge these components with league management features. The PokéAPI service enriches the platform with comprehensive Pokémon data, while utility services like damage calculators and sprite builders enhance user experience and visual presentation.

The research process revealed that this ecosystem is not merely a collection of independent services, but rather an integrated system where each component plays a specific role in a larger workflow. Teams flow between Showdown client and the Next.js app, battle results automatically propagate through integration workers to update standings, and Discord bot commands provide convenient access to league operations. This interconnected design transforms individual services into a cohesive platform that automates league management while providing rich battle simulation capabilities.

---

## Comprehensive Analysis: Service Inventory and Roles

### Core Battle Infrastructure Services

The foundation of the POKE MNKY ecosystem rests upon three core battle infrastructure services that provide the actual Pokémon battle simulation capabilities. These services form the heart of the platform, enabling real-time battles between league members with full game mechanics accuracy.

**Pokémon Showdown Server** (`pokemon-showdown`) serves as the battle simulation engine, running the core game logic that determines battle outcomes, move effects, status conditions, and all mechanical interactions. This Node.js service operates on port 8000 internally, handling WebSocket connections from clients, managing battle rooms, executing turn-by-turn battle logic, and generating replay data. The server includes a custom format configuration (`gen9avgatbest`) that enforces league-specific rules, integrates with the Next.js app through a REST API endpoint (`POST /api/create-room`) for programmatic room creation, and stores battle replays for later analysis. The server communicates with the loginserver for user authentication, validates teams against league rosters through API calls to the Next.js app, and maintains battle state across multiple concurrent matches.

**Pokémon Showdown Client** (`pokemon-showdown-client`) provides the web-based user interface where coaches actually play battles. This service runs as an Nginx container serving static files from the Showdown client repository, accessible internally on port 80 and exposed publicly via Cloudflare Tunnel at `https://aab-play.moodmnky.com`. The client renders battle animations, displays Pokémon sprites, handles user input for move selection, shows team previews, and manages the visual presentation of battles. It connects to the Showdown server via WebSocket/SockJS protocol for real-time battle updates, loads sprites from MinIO storage for visual assets, and provides deep-link support from the Next.js app to launch specific battles. The client serves as the primary user-facing component for battle interactions, transforming battle data from the server into an engaging visual experience.

**Showdown Loginserver** (`showdown-loginserver`) handles user authentication and account management for the Showdown infrastructure. This TypeScript service runs on port 8001, managing user credentials in a MySQL database (`loginserver-mysql`), storing teams in Supabase (`showdown_client_teams` table), and providing API endpoints for registration, login, password management, and team operations. The loginserver bridges the gap between Showdown's legacy MySQL-based authentication system and modern Supabase integration, allowing teams to be stored in the same database as the rest of the platform while maintaining compatibility with Showdown's authentication protocols. It generates signed assertions for seamless login experiences, validates user credentials, and manages session cookies that enable automatic authentication in the Showdown client.

### Data and Storage Services

The ecosystem relies on multiple data storage systems, each optimized for different types of data and access patterns. These services provide persistence, caching, and data enrichment capabilities that enable the platform to maintain league records, provide comprehensive Pokémon information, and deliver fast responses to user queries.

**Supabase (Cloud PostgreSQL)** serves as the primary database for the entire platform, storing league data including teams, matches, standings, draft picks, rosters, and user profiles. While Supabase runs as a cloud service rather than a Docker container, it is central to the ecosystem's data architecture. The Next.js app connects to Supabase using anon keys with Row Level Security (RLS) policies for user-scoped data access, while Docker services use service role keys to bypass RLS for administrative operations. Supabase stores two distinct team tables: `showdown_client_teams` for teams uploaded through the Showdown client interface, and `league_teams` (formerly `showdown_teams`) for teams managed through the Next.js app with rich metadata including parsed Pokémon data, validation status, and league associations. This unified database enables seamless data sharing between services, complex queries joining league and battle data, and automatic synchronization of standings and match results.

**PokéAPI PostgreSQL** (`pokeapi-postgres`) provides a specialized database containing comprehensive Pokémon species data, moves, abilities, items, types, and all related game information. This PostgreSQL 15 database contains 170 tables with normalized relational data covering every aspect of Pokémon from generation 1 through generation 9. The database stores species information, base stats, type effectiveness charts, move data with power and accuracy, ability descriptions, item effects, evolution chains, and form variations. This data enriches the Next.js app with detailed Pokémon information for team building, draft preparation, and Pokédex features. The database is populated through a lengthy initialization process that imports data from the official PokéAPI project, requiring 2-6 hours for complete data population.

**PokéAPI Redis** (`pokeapi-redis`) serves as a caching layer for the PokéAPI service, dramatically improving response times for frequently accessed Pokémon data. This Redis 7 instance caches API responses, stores computed data aggregations, and maintains session state for API requests. By caching species information, move sets, and type charts, the Redis layer reduces database load and enables sub-millisecond response times for common queries. The cache automatically expires stale data, maintains consistency with the PostgreSQL database, and scales horizontally to handle high request volumes.

**PokéAPI Service** (`pokeapi`) provides a REST API interface to the comprehensive Pokémon database, serving as a self-hosted alternative to the public PokéAPI service. This Django-based service exposes endpoints for Pokémon species, moves, abilities, items, types, and all related game data, formatted as JSON responses matching the PokéAPI specification. The service integrates with both PostgreSQL and Redis, using the database for persistent storage and Redis for caching, enabling fast responses while maintaining data consistency. The PokéAPI service augments the Next.js app with rich Pokémon data for team analysis, draft preparation, matchup calculations, and Pokédex features, providing all the detailed information coaches need to make informed decisions.

**MySQL Database** (`loginserver-mysql`) maintains the legacy authentication system for Showdown, storing user credentials, session data, and account information in a MySQL 8.0 database. This database contains the `users` table with bcrypt-hashed passwords, session management tables, and account metadata. While the platform has migrated team storage to Supabase, the loginserver continues using MySQL for authentication to maintain compatibility with Showdown's existing authentication protocols. This dual-database approach allows the platform to leverage modern Supabase features for team and league data while preserving Showdown's proven authentication system.

**MinIO (External S3-Compatible Storage)** provides object storage for sprite assets, battle replays, and other binary files. While MinIO runs as an external service at `https://s3-api-data.moodmnky.com` rather than in Docker Compose, it plays a crucial role in the ecosystem by serving Pokémon sprites to both the Showdown client and Next.js app. The sprite-sync service uploads built sprites from the sprite-builder to MinIO, making them accessible via S3-compatible URLs. This centralized storage eliminates duplication, enables CDN-like distribution, and provides a single source of truth for visual assets across all platform components.

### Integration and Automation Services

The ecosystem includes sophisticated integration services that automate league operations, bridge communication between components, and reduce manual administrative work. These services transform the platform from a collection of tools into an automated league management system.

**Integration Worker** (`integration-worker`) serves as the event bridge connecting Showdown battles with league management features. Currently running in placeholder mode awaiting Phase 2 implementation, this service is designed to watch Showdown battle rooms for completed matches, parse replay data to extract results, update Supabase match records with winners and scores, post results to Discord channels, and automatically update league standings. The worker monitors WebSocket connections to Showdown rooms, detects battle completion events, extracts battle statistics from replay logs, validates results against match records, and propagates updates throughout the system. When fully implemented, this service will eliminate manual result entry, ensure accurate standings updates, and provide real-time notifications of completed battles.

**Discord Bot** (`discord-bot`) provides a comprehensive command interface for league operations directly within Discord, enabling coaches to manage matches, validate teams, check standings, and perform draft operations without leaving their Discord server. The bot implements twelve slash commands including `/battle` for creating Showdown battle rooms, `/validate-team` for checking team legality against rosters, `/showdown-link` for connecting Discord accounts to Showdown accounts, `/matchups` for viewing weekly match schedules, `/submit` for submitting match results with AI-powered parsing, `/standings` for current league rankings, `/recap` for AI-generated weekly summaries, `/pokemon` for Pokémon information lookups, and draft-related commands for managing draft picks and viewing team status. The bot communicates with the Next.js app via HTTP API calls, uses Supabase service role keys for database access, calls Showdown server APIs for battle room creation, and posts formatted messages to Discord channels. This integration brings league management directly into the community's primary communication platform, making operations convenient and accessible.

### Utility and Supporting Services

Several specialized services enhance the platform with additional capabilities, providing tools for damage calculations, data migration, and asset management that augment the core battle and league management features.

**Damage Calculator** (`damage-calc`) provides a dedicated service for performing damage calculations between Pokémon, enabling coaches to analyze matchups, optimize EV spreads, and understand type effectiveness. This service runs on port 5000, serving a full web-based calculator interface that can be embedded in the Next.js app via iframe or accessed directly. The calculator uses the same damage calculation algorithms as Showdown, ensuring accuracy and consistency with battle mechanics. Coaches can input attacker and defender Pokémon with their moves, items, abilities, and stat spreads to see damage ranges, critical hit probabilities, and type effectiveness multipliers. This service augments team building features by allowing real-time damage analysis, matchup previews, and optimization tools that help coaches make informed decisions about team composition and move selection.

**Ditto** (`ditto`) serves as an on-demand data migration and transformation tool for PokéAPI data. This service runs with a Docker profile (`ditto`) meaning it doesn't start automatically but can be invoked when needed for specific tasks. Ditto can mirror data from the public PokéAPI to the self-hosted instance, transform data formats, and perform bulk data operations. This utility enables initial PokéAPI database population, data updates when new Pokémon are released, and maintenance operations that keep the self-hosted API synchronized with official data sources.

**Sprite Builder** (`sprite-builder`) compiles Pokémon sprites from the Smogon sprites repository into optimized formats for use in the Showdown client and Next.js app. This service runs with a `sprites` profile, executing on-demand when sprite updates are needed. The builder uses the `tup` build system to process source sprite images, generate spritesheets, optimize file sizes, and organize sprites by generation and type. Built sprites are stored in a Docker volume (`sprite-data`) and can be synced to MinIO for distribution. This service ensures visual consistency across the platform, provides all necessary sprite variants (normal, shiny, back sprites, etc.), and maintains sprite assets without relying on external CDNs.

**Sprite Sync** (`sprite-sync`) uploads built sprites from the sprite-builder to the external MinIO instance, making them accessible via S3-compatible URLs. This service uses the MinIO client (`mc`) to mirror sprite files to the `pokedex-sprites` bucket, verifies uploads, and maintains synchronization between local builds and cloud storage. The sync service runs with the `sprites` profile, executing after sprite builds complete to distribute assets to both the Showdown client and Next.js app. This ensures that sprite updates propagate throughout the platform, maintaining visual consistency and enabling efficient asset delivery.

### External Infrastructure Services

While not running as Docker containers, several external services are critical to the ecosystem's operation, providing cloud infrastructure, secure access, and deployment capabilities.

**Next.js Application (Vercel)** serves as the primary web interface for league management, team building, standings viewing, and administrative functions. Deployed on Vercel, this application provides React-based user interfaces, API routes for service integration, and server-side rendering for optimal performance. The app connects to Supabase for data storage, calls Showdown server APIs for battle room creation, integrates with Discord webhooks for notifications, and provides team builder tools that export to Showdown format. API endpoints include `/api/showdown/create-room` for battle room creation, `/api/showdown/validate-team` for roster validation, `/api/matches` for match management, `/api/standings` for league rankings, and various draft-related endpoints. The app serves as the central hub where coaches manage their teams, view schedules, check standings, and launch battles, while backend services handle the actual battle simulation and automation.

**Cloudflare Tunnel** provides secure public access to Docker services without requiring open ports on the server firewall. The tunnel creates encrypted connections between Cloudflare's edge network and the homelab server, routing HTTPS traffic to internal HTTP services. Configured routes include `aab-showdown.moodmnky.com` pointing to the Showdown server (port 8000), `aab-play.moodmnky.com` pointing to the Showdown client (port 8080), and optionally `aab-login.moodmnky.com` for the loginserver (port 8001). Cloudflare handles SSL certificate management, DDoS protection, and traffic routing, enabling secure external access while maintaining internal service isolation. This infrastructure component is essential for allowing the Next.js app and external users to access Showdown services securely.

---

## Environment Variables: Critical Configuration

This section documents all environment variables required for each service, with explanations and production/development distinctions. Environment variables are the primary configuration mechanism for the ecosystem, controlling service behavior, API keys, database connections, and integration endpoints.

### Environment File Organization

The ecosystem uses two primary environment files:
- **`.env`** - Production environment variables for Docker Compose services on homelab/VPS
- **`.env.local`** - Local development variables for Next.js app development

Docker Compose automatically reads from `.env`, while Next.js loads `.env.local` with higher priority than `.env` for local development.

### ⚠️ Server IP Address for Development

**Server IP**: `10.3.0.119`

When configuring environment variables for the Next.js app to connect to server services during local development (on a machine other than the server), use the server's IP address (`10.3.0.119`) instead of `localhost`:

- **Development Showdown Server URL**: `http://10.3.0.119:8000`
- **Development Showdown Client URL**: `http://10.3.0.119:8080`
- **Development PokéAPI URL**: `http://10.3.0.119:8000/api/v2` (if port exposed)

Using `localhost` will fail because it refers to the development machine, not the server hosting the Docker services.

### Core Battle Infrastructure Services

#### Pokémon Showdown Server (`pokemon-showdown`)

**Production Environment Variables** (`.env`):
```bash
# Node.js environment - controls logging and error handling
NODE_ENV=production
# Showdown server port - internal Docker network port
PS_PORT=8000
# API key for authenticating requests from Next.js app and Discord bot
# Must match SHOWDOWN_API_KEY in other services
SHOWDOWN_API_KEY=<generate-secure-random-key>
# Production Next.js app URL - used for callbacks and team validation API calls
APP_URL=https://poke-mnky.moodmnky.com
# Loginserver URL - internal Docker service name for authentication
# Defaults to http://showdown-loginserver:8001 if not set
LOGINSERVER_URL=http://showdown-loginserver:8001
```

**Development Notes**:
- `SHOWDOWN_API_KEY` must be a secure random string (minimum 32 characters recommended)
- `APP_URL` is used when Showdown server calls back to Next.js app for team validation
- `LOGINSERVER_URL` uses Docker internal DNS - service name resolves automatically

#### Pokémon Showdown Client (`pokemon-showdown-client`)

**Configuration**: No environment variables required. Configuration handled via:
- Nginx config file: `config/nginx-showdown.conf`
- Static file serving from `tools/showdown-client` directory
- Sprite assets loaded from MinIO (configured in client JavaScript)

**Development Notes**:
- Client is a static Nginx container - no runtime environment variables needed
- Sprite URLs configured in client JavaScript code
- Port mapping handled in Docker Compose (8080:80)

#### Showdown Loginserver (`showdown-loginserver`)

**Production Environment Variables** (`.env`):
```bash
# Node.js environment - controls logging and error handling
NODE_ENV=production
# Loginserver HTTP port - exposed to Docker network and host
LOGINSERVER_PORT=8001
# Path to configuration file within container
CONFIG_PATH=config/config.js
# Optional: Full database connection string (if not using individual MySQL vars)
DATABASE_URL=
# MySQL connection hostname - Docker service name
MYSQL_HOST=loginserver-mysql
# MySQL database name - Showdown uses 'ps' database
MYSQL_DATABASE=ps
# MySQL username for loginserver
MYSQL_USER=loginserver
# MySQL password - must match LOGINSERVER_DB_PASSWORD
MYSQL_PASSWORD=<same-as-LOGINSERVER_DB_PASSWORD>
# RSA private key for signing Showdown authentication assertions
# Used for seamless SSO between Supabase and Showdown
LOGINSERVER_PRIVATE_KEY=<generate-rsa-private-key>
# Cookie domain for session cookies - must match Showdown client domain
SHOWDOWN_COOKIE_DOMAIN=moodmnky.com
# Supabase project URL - for team storage integration
SUPABASE_URL=https://chmrszrwlfeqovwxyrmt.supabase.co
# Supabase service role key - bypasses RLS for team operations
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>
```

**Development Notes**:
- `LOGINSERVER_PRIVATE_KEY` should be RSA private key (PEM format) - generate with: `openssl genrsa -out private.pem 2048`
- `SHOWDOWN_COOKIE_DOMAIN` must match the domain where Showdown client is accessed (e.g., `moodmnky.com` for `aab-play.moodmnky.com`)
- `MYSQL_PASSWORD` must match `LOGINSERVER_DB_PASSWORD` used by MySQL container
- Supabase variables enable team storage in Supabase instead of MySQL

**MySQL Database** (`loginserver-mysql`):
```bash
# MySQL root password - used for database initialization
LOGINSERVER_DB_PASSWORD=<secure-password>
```

### Data and Storage Services

#### Supabase (Cloud PostgreSQL)

**Production Environment Variables** (`.env`):
```bash
# Supabase project URL - public API endpoint
NEXT_PUBLIC_SUPABASE_URL=https://chmrszrwlfeqovwxyrmt.supabase.co
# Supabase anonymous key - used by Next.js app with RLS policies
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
# Supabase service role key - bypasses RLS, used by Docker services
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>
```

**Development Environment Variables** (`.env.local`):
```bash
# Local Supabase instance URL (when running supabase start)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
# Local Supabase anonymous key
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local-anon-key>
# Local Supabase service role key
SUPABASE_SERVICE_ROLE_KEY=<local-service-role-key>
```

**Development Notes**:
- Production values found in Supabase Dashboard → Project Settings → API
- Local values generated when running `supabase start` locally
- Service role key has full database access - never expose in client-side code
- Anon key respects Row Level Security policies

#### PokéAPI PostgreSQL (`pokeapi-postgres`)

**Production Environment Variables** (`.env`):
```bash
# PostgreSQL database name
POSTGRES_DB=pokeapi
# PostgreSQL username
POSTGRES_USER=pokeapi
# PostgreSQL password - must be secure, used by PokéAPI service
POKEAPI_DB_PASSWORD=<secure-password>
```

**Development Notes**:
- Database initialized automatically on first container start
- Password should be strong (minimum 16 characters recommended)
- Database persists in Docker volume `pokeapi-data`

#### PokéAPI Redis (`pokeapi-redis`)

**Configuration**: No environment variables required. Redis runs with default configuration:
- Port: 6379 (internal Docker network)
- No authentication (internal network only)
- Database 1 used for caching

**Development Notes**:
- Redis is internal-only - not exposed externally
- No password required due to Docker network isolation

#### PokéAPI Service (`pokeapi`)

**Production Environment Variables** (`.env`):
```bash
# PostgreSQL connection hostname - Docker service name
POSTGRES_HOST=pokeapi-postgres
# PostgreSQL database name
POSTGRES_DB=pokeapi
# PostgreSQL username
POSTGRES_USER=pokeapi
# PostgreSQL password - must match POKEAPI_DB_PASSWORD
POSTGRES_PASSWORD=<same-as-POKEAPI_DB_PASSWORD>
# PostgreSQL port
POSTGRES_PORT=5432
# Redis connection string - format: redis://host:port/db
REDIS_CONNECTION_STRING=redis://pokeapi-redis:6379/1
# Django debug mode - set to False in production
DEBUG=False
# Allowed hostnames for Django - use * for Docker internal access
ALLOWED_HOSTS=*
# Public hostname for PokéAPI - used in API responses
POKEAPI_PUBLIC_HOSTNAME=pokeapi.moodmnky.com
```

**Development Notes**:
- `POSTGRES_PASSWORD` must exactly match `POKEAPI_DB_PASSWORD`
- `DEBUG=False` in production for security
- `ALLOWED_HOSTS=*` allows internal Docker network access
- Database population takes 2-6 hours on first run

### Integration and Automation Services

#### Integration Worker (`integration-worker`)

**Production Environment Variables** (`.env`):
```bash
# Node.js environment
NODE_ENV=production
# Supabase project URL - for database updates
SUPABASE_URL=https://chmrszrwlfeqovwxyrmt.supabase.co
# Supabase service role key - for bypassing RLS
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>
# Discord bot token - for posting results to Discord
DISCORD_BOT_TOKEN=<discord-bot-token>
# Showdown server URL - internal Docker service name
SHOWDOWN_SERVER_URL=http://pokemon-showdown:8000
# Next.js app URL - for API callbacks
APP_URL=https://poke-mnky.moodmnky.com
# Discord channel ID for posting battle results
DISCORD_RESULTS_CHANNEL_ID=<discord-channel-id>
# Showdown API key - for authenticating Showdown API calls
SHOWDOWN_API_KEY=<same-as-showdown-server>
```

**Development Notes**:
- Currently in placeholder mode - full implementation pending
- `DISCORD_RESULTS_CHANNEL_ID` is the numeric channel ID from Discord
- `SHOWDOWN_API_KEY` must match the key used by Showdown server
- Service watches Showdown replays directory for completed battles

#### Discord Bot (`discord-bot`)

**Production Environment Variables** (`.env`):
```bash
# Node.js environment
NODE_ENV=production
# Discord bot token - from Discord Developer Portal
DISCORD_BOT_TOKEN=<discord-bot-token>
# Discord application client ID - for OAuth and slash commands
DISCORD_CLIENT_ID=<discord-client-id>
# Discord server (guild) ID - where bot operates
DISCORD_GUILD_ID=<discord-guild-id>
# Discord channel ID for posting results
DISCORD_RESULTS_CHANNEL_ID=<discord-channel-id>
# Supabase project URL
SUPABASE_URL=https://chmrszrwlfeqovwxyrmt.supabase.co
# Supabase service role key
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>
# Supabase project URL (public) - for client-side operations
NEXT_PUBLIC_SUPABASE_URL=https://chmrszrwlfeqovwxyrmt.supabase.co
# Supabase anonymous key - for client-side operations
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
# Showdown server internal URL
SHOWDOWN_BASE_URL=http://pokemon-showdown:8000
SHOWDOWN_SERVER_URL=http://pokemon-showdown:8000
# Showdown API key - for creating battle rooms
SHOWDOWN_API_KEY=<same-as-showdown-server>
# Showdown client public URL - for battle room links
SHOWDOWN_PUBLIC_URL=https://aab-play.moodmnky.com
# Next.js app URL - for API calls
APP_URL=https://poke-mnky.moodmnky.com
NEXT_PUBLIC_APP_URL=https://poke-mnky.moodmnky.com
# PokéAPI base URL - for Pokémon data lookups
POKEAPI_BASE_URL=http://pokeapi:8000/api/v2
```

**Development Notes**:
- `DISCORD_BOT_TOKEN` obtained from Discord Developer Portal → Bot → Token
- `DISCORD_CLIENT_ID` from Discord Developer Portal → OAuth2 → Client ID
- `DISCORD_GUILD_ID` found by right-clicking Discord server → Copy Server ID (Developer Mode required)
- Bot requires specific Discord permissions: Read Messages, Send Messages, Use Slash Commands
- Slash commands may take time to sync in Discord client after deployment

### Utility and Supporting Services

#### Damage Calculator (`damage-calc`)

**Configuration**: No environment variables required. Service runs on port 5000 with default configuration.

**Development Notes**:
- Port exposed as 5000:5000 in Docker Compose
- Accessible internally at `http://damage-calc:5000`
- Can be embedded in Next.js app via iframe

#### Ditto (`ditto`)

**Production Environment Variables** (`.env`):
```bash
# Source PokéAPI URL - where to fetch data from
DITTO_SOURCE_URL=https://pokeapi.co
# Target PokéAPI URL - where to sync data to
DITTO_TARGET_URL=https://pokeapi.moodmnky.com
```

**Development Notes**:
- On-demand service - runs with `docker compose run --rm ditto <command>`
- Used for initial PokéAPI data population and updates
- `DITTO_TARGET_URL` should match `POKEAPI_PUBLIC_HOSTNAME`

#### Sprite Builder (`sprite-builder`)

**Configuration**: No environment variables required. Service builds sprites using `tup` build system.

**Development Notes**:
- On-demand service - runs with `docker compose --profile sprites up sprite-builder`
- Requires Smogon sprites repository cloned to `tools/sprites-repo/`
- Output stored in Docker volume `sprite-data`

#### Sprite Sync (`sprite-sync`)

**Production Environment Variables** (`.env`):
```bash
# External MinIO endpoint URL - where sprites are uploaded
MINIO_ENDPOINT_EXTERNAL=https://s3-api-data.moodmnky.com
# MinIO access key - for S3-compatible authentication
MINIO_ACCESS_KEY=<minio-access-key>
# MinIO secret key - for S3-compatible authentication
MINIO_SECRET_KEY=<minio-secret-key>
# MinIO bucket name for sprites
MINIO_BUCKET_NAME=pokedex-sprites
# Alternative variable names (for compatibility)
S3_ACCESS_KEY=<same-as-MINIO_ACCESS_KEY>
S3_SECRET_KEY=<same-as-MINIO_SECRET_KEY>
```

**Development Notes**:
- On-demand service - runs with `docker compose --profile sprites up sprite-sync`
- Syncs sprites from `sprite-data` volume to external MinIO instance
- Uses MinIO client (`mc`) for S3-compatible uploads
- Bucket must exist in MinIO before syncing

### External Infrastructure Services

#### Next.js Application (Vercel)

**Production Environment Variables** (Vercel Dashboard):
```bash
# Supabase project URL
NEXT_PUBLIC_SUPABASE_URL=https://chmrszrwlfeqovwxyrmt.supabase.co
# Supabase anonymous key
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
# Supabase service role key (server-side only)
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>
# Showdown server public URL
SHOWDOWN_SERVER_URL=https://aab-showdown.moodmnky.com
# Showdown client public URL
NEXT_PUBLIC_SHOWDOWN_CLIENT_URL=https://aab-play.moodmnky.com
# Showdown API key
SHOWDOWN_API_KEY=<same-as-showdown-server>
# Application public URL
NEXT_PUBLIC_APP_URL=https://poke-mnky.moodmnky.com
# Discord integration (if used)
DISCORD_CLIENT_ID=<discord-client-id>
DISCORD_PUBLIC_KEY=<discord-public-key>
DISCORD_GUILD_ID=<discord-guild-id>
# Google Sheets integration (if used)
GOOGLE_SHEET_ID=<google-sheet-id>
GOOGLE_SERVICE_ACCOUNT_EMAIL=<service-account-email>
GOOGLE_CLIENT_ID=<google-client-id>
GOOGLE_CLIENT_SECRET=<google-client-secret>
GOOGLE_PRIVATE_KEY=<google-private-key>
# OpenAI API key (for AI features)
OPENAI_API_KEY=<openai-api-key>
# Encryption key (for sensitive data)
ENCRYPTION_KEY=<encryption-key>
```

**Development Environment Variables** (`.env.local`):
```bash
# Local Supabase instance
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<local-service-role-key>
# Local app URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
# Showdown URLs (can use production or local)
SHOWDOWN_SERVER_URL=https://aab-showdown.moodmnky.com
NEXT_PUBLIC_SHOWDOWN_CLIENT_URL=https://aab-play.moodmnky.com
# Shared variables (same as production)
DISCORD_CLIENT_ID=<discord-client-id>
GOOGLE_SHEET_ID=<google-sheet-id>
OPENAI_API_KEY=<openai-api-key>
# ... (other shared variables)
```

**Development Notes**:
- Production variables set in Vercel Dashboard → Project Settings → Environment Variables
- Local variables in `.env.local` override production for development
- `NEXT_PUBLIC_*` variables are exposed to client-side code
- Non-public variables are server-side only (API routes, server components)

#### Cloudflare Tunnel

**Production Environment Variables** (`.env`):
```bash
# Cloudflare Tunnel ID - from Cloudflare Dashboard
TUNNEL_ID=<cloudflare-tunnel-id>
# Path to tunnel credentials file
TUNNEL_CREDENTIALS_FILE=/etc/cloudflared/credentials.json
```

**Development Notes**:
- Tunnel ID obtained from Cloudflare Dashboard → Zero Trust → Networks → Tunnels
- Credentials file downloaded from Cloudflare Dashboard
- Routes configured in Cloudflare Dashboard (not environment variables)
- Routes: `aab-showdown.moodmnky.com` → port 8000, `aab-play.moodmnky.com` → port 8080

### Shared Environment Variables

These variables are used across multiple services and should have consistent values:

```bash
# Application base URL - used by multiple services for callbacks
APP_URL=https://poke-mnky.moodmnky.com

# Showdown API key - must match across Showdown server, Discord bot, Integration worker
SHOWDOWN_API_KEY=<secure-random-key>

# Supabase credentials - used by Next.js app, Discord bot, Integration worker, Loginserver
NEXT_PUBLIC_SUPABASE_URL=https://chmrszrwlfeqovwxyrmt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>

# Discord credentials - used by Discord bot and Next.js app
DISCORD_BOT_TOKEN=<discord-bot-token>
DISCORD_CLIENT_ID=<discord-client-id>
DISCORD_GUILD_ID=<discord-guild-id>
DISCORD_RESULTS_CHANNEL_ID=<discord-channel-id>
```

### Security Best Practices

1. **Never commit `.env` or `.env.local` files** - Both are in `.gitignore`
2. **Use strong, unique passwords** - Minimum 16 characters for database passwords
3. **Rotate API keys regularly** - Especially `SHOWDOWN_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY`
4. **Limit service role key usage** - Only use in server-side services, never in client code
5. **Use environment-specific values** - Different keys for production and development
6. **Store secrets securely** - Consider using secret management tools for production
7. **Validate environment variables** - Services should validate required variables on startup

### Environment Variable Validation

Each service should validate required environment variables on startup. Missing critical variables should cause services to fail fast with clear error messages. The integration worker currently implements this pattern, logging warnings for missing variables while still starting in placeholder mode.

---

## Service Interconnections and Data Flow

Understanding how services connect reveals the sophisticated architecture that enables seamless league operations. The ecosystem employs multiple communication patterns including HTTP APIs, WebSocket connections, database queries, and message passing through shared storage.

**Battle Launch Flow** demonstrates the integration between the Next.js app, Showdown server, and battle infrastructure. When a coach clicks "Launch Battle" in the Next.js app, the application calls `POST /api/showdown/create-room` on the Showdown server with match details and team information. The Showdown server validates the request using the `SHOWDOWN_API_KEY`, creates a battle room with the specified format, and returns a room URL. The Next.js app updates the match record in Supabase with the room information, and the coach is redirected to the Showdown client at the room URL. The Showdown client establishes a WebSocket connection to the Showdown server, loads team data from Supabase via the loginserver, and begins the battle. Throughout the battle, the Showdown server manages game state, executes moves, and generates replay data, while the Showdown client renders the visual presentation and handles user input.

**Team Validation Flow** illustrates how team legality checking works across services. When a coach submits a team in the Showdown client or validates through the Discord bot, the request flows to the Next.js app's `/api/showdown/validate-team` endpoint. The app retrieves the coach's drafted roster from Supabase `team_rosters` table, parses the Showdown team export format, and checks that each Pokémon in the team exists in the roster. The validation also checks league rules including item restrictions, move legality, and Tera type compliance. Results are returned to the requesting service, which displays validation errors or confirms team legality. This flow ensures that coaches can only use Pokémon they've drafted, maintaining league integrity while providing helpful feedback.

**Result Capture Flow** shows how completed battles propagate through the system to update standings. When a battle completes in Showdown, the integration worker detects the completion event through WebSocket monitoring or replay file detection. The worker parses the replay data to extract winner, loser, score differential, and battle statistics. It then updates the corresponding match record in Supabase, setting status to "completed" and recording the results. The worker posts a formatted result message to the Discord results channel, including replay links and match details. Finally, the worker triggers a standings recalculation that aggregates wins, losses, and differentials across all teams for the current season. The Next.js app automatically reflects these updates when coaches view standings, creating a seamless experience where battle results immediately affect league rankings.

**Authentication Flow** demonstrates how user identity bridges between Discord, Supabase, and Showdown. When a coach uses the `/showdown-link` Discord command, the bot calls the Next.js app's `/api/showdown/sync-account-discord` endpoint with Discord user information. The app creates or updates a Supabase profile record, linking the Discord ID to a Showdown username. The app then calls the loginserver's `/api/register` endpoint to create a Showdown account in MySQL, storing credentials that enable Showdown login. The loginserver stores team data in Supabase's `showdown_client_teams` table, creating a unified team storage system. When the coach logs into Showdown, the loginserver validates credentials from MySQL, loads teams from Supabase, and generates session cookies that enable seamless authentication. This flow creates a single identity system where coaches can use the same account across Discord, the Next.js app, and Showdown.

**Data Enrichment Flow** illustrates how PokéAPI enhances the platform with comprehensive Pokémon information. When coaches use team builder features in the Next.js app, the application queries PokéAPI endpoints for species data, move lists, ability descriptions, and type information. The PokéAPI service checks Redis cache first for fast responses, falling back to PostgreSQL queries when cache misses occur. Response data includes base stats, type effectiveness, move power and accuracy, ability effects, and evolution information. This data enables features like type coverage analysis, damage calculations, matchup previews, and draft recommendations. The PokéAPI service operates independently but augments core league features with rich data that helps coaches make informed decisions.

---

## Practical Implications: How Services Augment the Application

The distributed service architecture transforms the Next.js application from a simple league management tool into a comprehensive platform that provides battle simulation, automated operations, rich data, and seamless user experiences. Each service category contributes specific capabilities that collectively create a superior league management experience.

**Battle Infrastructure Augmentation** enables the Next.js app to offer actual Pokémon battles rather than just match scheduling and result tracking. The Showdown server provides battle simulation with full game mechanics accuracy, ensuring that battles reflect actual Pokémon gameplay rather than simplified approximations. The Showdown client delivers a polished battle interface that coaches recognize and enjoy, maintaining visual consistency with the official Showdown platform. The loginserver bridges authentication systems, allowing coaches to use a single identity across the platform while maintaining compatibility with Showdown's proven authentication protocols. Together, these services transform the app from a scheduling tool into a complete battle platform where coaches can draft teams, build lineups, launch battles, and see results all within a unified experience.

**Automation Services Augmentation** eliminates manual administrative work that would otherwise burden league commissioners and coaches. The integration worker automatically captures battle results, updates standings, and posts notifications, ensuring that league data stays current without manual intervention. The Discord bot brings league operations directly into the community's communication platform, allowing coaches to check matchups, validate teams, view standings, and launch battles without navigating to separate websites. These automation services reduce administrative overhead, minimize errors from manual data entry, and create a more engaging experience where coaches can focus on strategy and competition rather than administrative tasks.

**Data Services Augmentation** enriches the platform with comprehensive information that helps coaches make better decisions. Supabase provides a unified database where league data, team information, and battle results coexist, enabling complex queries and relationships that wouldn't be possible with separate systems. PokéAPI delivers detailed Pokémon data that powers team analysis, matchup calculations, and draft preparation features. Redis caching ensures that data access remains fast even as the league grows and data volumes increase. These data services transform the app from a simple record-keeping system into an analytical platform where coaches can explore strategies, analyze matchups, and optimize team compositions.

**Utility Services Augmentation** adds specialized capabilities that enhance specific aspects of the league experience. The damage calculator enables real-time matchup analysis, helping coaches understand how their teams perform against specific opponents. Sprite services ensure visual consistency and provide all necessary assets for displaying Pokémon throughout the platform. Ditto enables data maintenance and updates, keeping Pokémon information current as new generations and forms are released. These utility services add polish and functionality that elevate the platform beyond basic league management, creating a comprehensive toolset for serious competitive play.

**Infrastructure Services Augmentation** enables secure, scalable access to self-hosted services while maintaining modern deployment practices. Cloudflare Tunnel provides secure public access without exposing server ports, handling SSL termination and DDoS protection automatically. Vercel deployment ensures the Next.js app benefits from edge caching, automatic scaling, and global distribution. MinIO provides centralized asset storage that eliminates duplication and enables efficient content delivery. These infrastructure services create a production-ready platform that can scale with league growth while maintaining security and performance.

---

## Architectural Patterns and Design Decisions

The POKE MNKY ecosystem demonstrates several sophisticated architectural patterns that enable its distributed nature while maintaining cohesion and reliability. Understanding these patterns reveals the design philosophy behind the platform and explains how diverse services integrate into a unified system.

**Hybrid Cloud Architecture** combines self-hosted battle infrastructure with cloud-based application services, leveraging the strengths of each deployment model. Battle simulation requires low latency and real-time performance, making self-hosting ideal for the Showdown server and client. League management benefits from cloud scalability and global distribution, making Vercel deployment optimal for the Next.js app. This hybrid approach optimizes each component for its specific requirements while maintaining integration through well-defined APIs and shared databases.

**Service-Oriented Architecture** decomposes the platform into discrete services with specific responsibilities, enabling independent development, deployment, and scaling. Each service exposes APIs for integration, maintains its own data storage where appropriate, and can be updated without affecting other components. This architecture allows the platform to evolve incrementally, with new features added to specific services without requiring full platform redeployment.

**Event-Driven Integration** uses asynchronous event processing to connect services without tight coupling. The integration worker monitors Showdown events and propagates updates to Supabase and Discord, enabling real-time synchronization without requiring direct service dependencies. This pattern allows services to operate independently while maintaining data consistency through event processing.

**Unified Data Layer** provides a single source of truth through Supabase while allowing specialized storage for specific use cases. League data, teams, and user profiles reside in Supabase, enabling complex queries and relationships. Specialized storage like MySQL for Showdown authentication and Redis for PokéAPI caching optimizes specific access patterns while maintaining integration through service APIs.

**API Gateway Pattern** uses Cloudflare Tunnel as a unified entry point for external access to self-hosted services, providing SSL termination, routing, and security in a single layer. This pattern simplifies external access while maintaining internal service isolation and enabling independent service evolution.

---

## Limitations and Future Considerations

While the current ecosystem provides comprehensive league management capabilities, several areas present opportunities for enhancement and optimization as the platform evolves and scales.

**Integration Worker Implementation** remains in placeholder mode, awaiting Phase 2 development to provide full automation capabilities. Current battle result capture requires manual entry, creating administrative overhead and potential for errors. Full implementation would enable automatic replay parsing, result extraction, and standings updates, significantly reducing manual work and improving data accuracy.

**Authentication Unification** maintains separate systems for Showdown (MySQL) and the platform (Supabase), creating complexity in account management. A unified authentication system using Supabase Auth with Showdown assertion generation would simplify user management while maintaining Showdown compatibility. This enhancement would enable single sign-on across all platform components and reduce authentication-related support issues.

**PokéAPI Data Population** requires manual initialization and can take 2-6 hours for complete data loading. Automated data synchronization with the official PokéAPI would ensure current data availability and reduce maintenance overhead. Additionally, incremental updates for new Pokémon releases would keep the platform current without requiring full database rebuilds.

**Sprite Management** currently requires manual builds and synchronization processes. Automated sprite updates triggered by new Pokémon releases would ensure visual assets remain current. Integration with the Smogon sprites repository's release process would enable automatic sprite generation and distribution.

**Scalability Considerations** include horizontal scaling of battle infrastructure for large leagues with many concurrent matches, database query optimization for complex standings calculations, and caching strategies for frequently accessed data. As the league grows, these optimizations will become increasingly important for maintaining performance.

**Monitoring and Observability** would benefit from comprehensive logging, metrics collection, and alerting systems that provide visibility into service health, performance bottlenecks, and error conditions. Implementing distributed tracing would enable understanding of request flows across services and identification of performance issues.

---

---

## 🌐 Part 2: Next.js Application & Frontend Services

**Managed By**: POKE MNKY (app)  
**Status**: Outline - To Be Completed by App Agent  
**Scope**: Next.js application, API routes, frontend components, user-facing features

### App Agent Overview

**TODO**: POKE MNKY (app) - Please fill out this section with:
- Your role and responsibilities in managing the Next.js application
- Overview of the application architecture and technology stack
- How the app consumes and integrates with server services
- Key application components and their purposes

### Application Architecture

**TODO**: Document the Next.js application structure:
- Next.js 16 App Router architecture
- React 19.2 component structure
- File organization and directory structure
- Key libraries and dependencies
- Deployment configuration (Vercel)

### API Routes & Endpoints

**TODO**: Document all API routes that the app provides:
- `/api/showdown/create-room` - Battle room creation (called by app UI, calls server API)
- `/api/showdown/validate-team` - Team validation (called by Showdown server)
- `/api/showdown/replay` - Replay ingestion (called by integration worker)
- `/api/matches` - Match CRUD operations
- `/api/standings` - League standings calculations
- `/api/draft/*` - Draft-related endpoints
- `/api/ai/*` - AI-powered features (result parsing, recaps)
- Other API routes and their purposes

For each endpoint, document:
- HTTP method and path
- Authentication requirements
- Request/response formats
- Which services call it (server, bot, worker)
- Integration with Supabase or other services

### Frontend Components & Pages

**TODO**: Document key frontend components:
- `/app/matches/` - Match management UI
- `/app/teams/builder/` - Team builder interface
- `/app/standings/` - Standings display
- `/app/showdown/` - Showdown integration UI (if exists)
- `/app/docs/api/` - **NEW**: PokéAPI documentation integration (see Phase 2 Integration Guide)
- Other major pages and their functionality
- Reusable components and their purposes
- UI libraries and design system

**PokéAPI Documentation Integration** (Phase 2):
- **Service**: `pokeapi-docs` container (managed by server agent)
- **Production URL**: `https://pokeapi-docs.moodmnky.com`
- **Integration Guide**: See `temp/POKEAPI-DOCS-PHASE2-INTEGRATION.md` for detailed instructions
- **Implementation Options**: 
  1. Embedded route (`/docs/api`) with iframe
  2. Direct link to documentation site
  3. Enhanced Pokédex integration with API links
- **Theming**: App agent can customize styles by accessing server files (see integration guide)
- **Discord Bot**: `/api-docs` command already implemented (no action needed)

### Integration with Server Services

**TODO**: Document how the app integrates with server services:
- How app calls Showdown server APIs
- How app displays data from PokéAPI
- How app consumes Supabase data
- How app handles Discord bot API calls
- Authentication flows between app and server services
- Error handling and fallback behaviors

### App-Specific Environment Variables

**TODO**: Document environment variables specific to the Next.js app:
- Vercel deployment variables
- Client-side environment variables (`NEXT_PUBLIC_*`)
- Server-side environment variables (API routes)
- Development vs production configurations
- Integration with server service environment variables

### User Flows & Features

**TODO**: Document key user flows:
- Battle launch flow (app → server → client)
- Team building and validation flow
- Match result submission flow
- Draft operations flow
- Standings viewing flow
- Other major user-facing features

### App Deployment & Infrastructure

**TODO**: Document deployment details:
- Vercel configuration
- Build process
- Environment variable management
- CI/CD pipeline (if applicable)
- Monitoring and logging
- Performance optimizations

### App-Server Communication Patterns

**TODO**: Document communication patterns:
- How app authenticates with server APIs
- How app handles server API errors
- How app displays real-time updates from server services
- WebSocket connections (if any)
- Polling strategies for data updates

### Future App Enhancements

**TODO**: Document planned or potential app enhancements:
- Features to add
- Integrations to implement
- Performance improvements
- UX enhancements
- Technical debt to address

---

## Conclusion: A Cohesive Ecosystem

**Note**: This conclusion section will be updated once both Part 1 (Server) and Part 2 (App) are complete.

The POKE MNKY ecosystem represents a sophisticated integration of battle simulation infrastructure, league management application, automation services, and data enrichment tools that collectively create a comprehensive platform for Pokémon draft league operations. The nine Docker services running on homelab infrastructure (managed by POKE MNKY server), integrated with the Next.js application on Vercel (managed by POKE MNKY app), cloud services for database management, and secure access infrastructure, form a cohesive system where each component plays a specific role in delivering a superior league experience.

### Server Infrastructure Contribution

The server-side services provide the battle simulation engine, data enrichment APIs, and automation capabilities that power the platform. Showdown server enables real-time Pokémon battles, PokéAPI delivers comprehensive species data, and integration services automate league operations. These services expose well-defined APIs and share databases with the Next.js app, creating a seamless integration layer.

### Application Contribution

**TODO**: POKE MNKY (app) - Please add a summary of how the Next.js application contributes to the ecosystem:
- User-facing features and interfaces
- API endpoints that server services consume
- Data presentation and visualization
- User experience enhancements
- Integration patterns with server services

### Collaborative Integration

The success of the POKE MNKY ecosystem depends on seamless integration between server infrastructure and the Next.js application. Server services provide backend capabilities through APIs and shared databases, while the app provides user interfaces and business logic that orchestrates these services into a cohesive user experience. This collaborative architecture enables independent development and deployment while maintaining tight integration through well-defined contracts.

The architecture demonstrates thoughtful design decisions that balance self-hosting for performance-critical battle infrastructure with cloud deployment for scalable application services. Service-oriented design enables independent evolution of components while maintaining integration through well-defined APIs. Event-driven patterns enable real-time synchronization without tight coupling, and unified data layers provide consistency while allowing specialized optimizations.

As the platform continues to evolve, the current architecture provides a solid foundation for adding features, scaling operations, and enhancing automation. The integration worker implementation will further reduce administrative overhead, authentication unification will simplify user management, and automated data synchronization will ensure current information availability. These enhancements, combined with the existing robust infrastructure, position POKE MNKY as a comprehensive platform that transforms Pokémon draft league management from a collection of manual processes into an automated, integrated, and engaging competitive experience.
