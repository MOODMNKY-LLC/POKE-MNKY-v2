# Infisical (self-hosted)

The existing POKE MNKY Infisical project can supply secrets to local tooling and opt-in CI. The Next.js app does not call Infisical. Vercel deployments keep using the environment variables already configured on Vercel.

This integration has not been authenticated against the instance. `pnpm secrets:plan` only checks local configuration. It does not log in or read secret values.

Official behavior this wraps (CLI reference, November 2026):

- `infisical secrets-manager run` injects secrets into a child process. It does not add a client to the Next.js bundle.
- If `--domain` and `INFISICAL_DOMAIN` are unset, the CLI uses US Cloud at `https://app.infisical.com`. Machine-identity login does the same unless the domain is set.
- If `--env` and `INFISICAL_ENVIRONMENT` are unset, the CLI uses the `dev` environment.
- A committed `.infisical.yaml` `domain` can redirect later CLI commands. This repo gitignores that file and always passes `--domain`.

## Slots

`INFISICAL_DEPLOYMENT_SLOT` is required. The slug sent as `--env` comes from `lib/infisical/environments.ts`:

| Slot | Infisical slug | Intended use |
| --- | --- | --- |
| `development` | `dev` | Local `pnpm secrets:run -- pnpm dev` |
| `preview` | `staging` | Opt-in CI or a future Vercel Preview sync |
| `production` | `prod` | Opt-in CI or a future Vercel Production sync |

These are Infisical's conventional slugs, not a confirmed copy of the existing project. If that project uses different slugs, change the map before the first authenticated run. A mismatch with `INFISICAL_ENVIRONMENT` fails instead of picking the other environment.

Imports and personal overrides are off unless `INFISICAL_INCLUDE_IMPORTS=true` or `INFISICAL_SECRET_OVERRIDING=true`.

## Configure

Install the CLI separately ([CLI quickstart](https://infisical.com/docs/cli/usage)). `pnpm install` does not download it. Put values in `.env.local` (gitignored) or the shell. Names are also listed, empty, in `.env.example`.

| Name | Required | Purpose |
| --- | --- | --- |
| `INFISICAL_DOMAIN` | Yes | Self-hosted origin, for example `https://REPLACE_WITH_YOUR_INFISICAL_HOST`. `INFISICAL_API_URL` is the older alias. Hosts under `infisical.com` are refused. |
| `INFISICAL_PROJECT_ID` | Yes | Existing project id from Project Settings. Do not create a new project for this repo. |
| `INFISICAL_DEPLOYMENT_SLOT` | Yes | `development`, `preview`, or `production`. |
| `INFISICAL_AUTH` | Yes | `cli-profile`, `token`, or `universal-auth`. |
| `INFISICAL_TOKEN` | For `token` | Access token from a machine-identity login. Not printed by these scripts. |
| `INFISICAL_UNIVERSAL_AUTH_CLIENT_ID` | For `universal-auth` | Machine identity client id. Passed via the environment, not argv. |
| `INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET` | For `universal-auth` | Machine identity client secret. Same. |
| `INFISICAL_SECRET_PATH` | No | Folder. Default `/`. |
| `INFISICAL_CLI` | No | Path to the `infisical` binary. |

`cli-profile` is for a laptop session after `infisical login --domain="$INFISICAL_DOMAIN"`. It refuses to run if `INFISICAL_TOKEN` or `INFISICAL_UNIVERSAL_AUTH_ACCESS_TOKEN` is also set, so a leftover token cannot override the profile. `universal-auth` runs `infisical login --method=universal-auth --silent --plain` against that domain, then `secrets-manager run`. The child app process drops those credentials before your command starts. Injected app secrets remain.

```bash
pnpm secrets:plan
pnpm secrets:run -- pnpm dev
```

`secrets:plan` prints the host, slot, slug, and auth mode. It does not print the project id or any secret.

## CI

`.github/workflows/infisical-optional.yml` is `workflow_dispatch` only. The job runs only when the repository variable `INFISICAL_ENABLED` is `true`. Pull requests, forks, and previews do not run it and do not need Infisical credentials. The default Test workflow is unchanged.

When you choose to turn it on, set that variable and:

- variable `INFISICAL_DEPLOYMENT_SLOT` to the slot this dispatch should read
- secrets `INFISICAL_DOMAIN`, `INFISICAL_PROJECT_ID`, `INFISICAL_UNIVERSAL_AUTH_CLIENT_ID`, `INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET`

The workflow installs `@infisical/cli` only in that opt-in job, then runs `pnpm secrets:run` with a command that exits immediately. A failed login fails the dispatch. It does not change Vercel or the default CI build.

## Vercel

Do not point the Next.js start command at Infisical. Production and preview runtime should keep the variables already stored on the Vercel project.

A later [Vercel secret sync](https://infisical.com/docs/integrations/secret-syncs/vercel) can copy one Infisical environment into one Vercel environment (Development, Preview, or Production). Create three syncs if you want all three slots. On the self-hosted instance, use that instance's API, not `https://app.infisical.com`.

Do not enable a sync that overwrites or deletes destination secrets until you have reviewed it. Infisical documents that overwrite removes destination keys it does not manage, and that Vercel hides sensitive values so an import can create empty Infisical secrets. Prefer a key schema and disable secret deletion if some Vercel variables stay manual. This change does not create a connection, sync, or project.

## Still needed from the instance

1. Self-hosted origin.
2. Existing project id.
3. Confirmation of the environment slugs for dev, preview, and prod.
4. A machine identity on that project with read access to those environments, plus a Universal Auth client id and client secret stored outside git.
5. A decision on whether Vercel sync is wanted later. Until then, Vercel env vars stay the deploy source.
