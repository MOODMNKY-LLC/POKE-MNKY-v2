# Coach Onboarding – Notion and Supabase integration

The coach onboarding flow (Dashboard → Onboarding) is fully hooked up to **Supabase** (progress and profile sync) and optionally to **Notion** (full guide link).

## Supabase integration

- **Table**: `coach_onboarding` stores per-user progress (`current_step`, `completed_steps`, `completed_at`). RLS allows authenticated users to select/insert/update only their own row.
- **API**: `GET /api/coach-onboarding` returns current step and completed steps; `PATCH /api/coach-onboarding` updates step and optionally marks onboarding complete.
- **Profile sync**: When the user marks onboarding complete (or reaches step `complete` with `mark_complete: true`), the API sets `profiles.onboarding_completed = true` for that user. The dashboard uses this to show a “Finish coach onboarding” card for coaches who have a team but have not completed onboarding. A one-time sync on GET ensures existing completed onboarding rows also set `profiles.onboarding_completed`.
- **Navigation**: Dashboard sidebar includes an “Onboarding” link under Dashboard. The dashboard shows “Continue onboarding” for coaches with a team and `onboarding_completed === false`.

## Team Builder hookup

- On the **Team builder intro** step, the onboarding page shows **“Open Team Builder”** (primary) and **“Coach & team builder guide”** (outline). Both link to `/dashboard/teams/builder` and `/dashboard/guides/coach-and-team-builder` respectively.
- On the **Complete** step, the page shows **“Open Team Builder”** and **“View all guides”** so users can go straight to the builder or browse guides.

## Notion “View full guide” feature

The coach onboarding flow can show a **“View full guide in Notion”** button when a Notion page is configured. The app fetches the page URL (and title) from the Notion API and links to it.

## Environment variables

Copy these into `.env.local` (or your deployment environment). For **Vercel**, `COACH_ONBOARDING_NOTION_PAGE_ID` is already set for Production and Preview (League Wiki page); ensure `NOTION_API_KEY` is set in the Vercel project for the “View full guide in Notion” link to work.

| Variable | Required | Description |
|----------|----------|-------------|
| `NOTION_API_KEY` | Yes (for Notion feature) | Notion integration token. Create at [Notion Integrations](https://www.notion.so/my-integrations), then share the target page (or parent) with the integration. |
| `COACH_ONBOARDING_NOTION_PAGE_ID` | No | Notion page ID or URL for the “full guide.” When set (with `NOTION_API_KEY`), the onboarding page shows “View full guide in Notion” linking to this page. |

## Example: League Wiki

You can use the **League Wiki** page as the full guide (rules, getting started, etc.):

```env
NOTION_API_KEY=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
COACH_ONBOARDING_NOTION_PAGE_ID=2e7cd2a6-5422-81ee-861f-c3ae53e70c7a
```

- **Page ID (with dashes):** `2e7cd2a6-5422-81ee-861f-c3ae53e70c7a`
- **Page URL:** `https://www.notion.so/2e7cd2a6542281ee861fc3ae53e70c7a`

Page IDs can be provided with or without dashes; the API normalizes them.

## How it works

1. **API:** `GET /api/coach-onboarding/notion`  
   - If `COACH_ONBOARDING_NOTION_PAGE_ID` and `NOTION_API_KEY` are set, the route calls the Notion API to retrieve the page and returns `notion_page_url` and `title`.  
   - Otherwise it returns `{ notion_page_url: null }`.

2. **UI:** The dashboard onboarding page (`/dashboard/onboarding`) calls this API. If `notion_page_url` is present, it shows a **“View full guide in Notion”** button that opens the Notion page in a new tab.

## Finding another page ID in Notion

- Open the page in Notion and copy the URL. The page ID is the 32-character hex string (with or without dashes), e.g.  
  `https://www.notion.so/Workspace-2e7cd2a6542281ee861fc3ae53e70c7a` →  
  `2e7cd2a6542281ee861fc3ae53e70c7a` or `2e7cd2a6-5422-81ee-861f-c3ae53e70c7a`.
- Or use the Notion MCP **notion-search** / **notion-fetch** tools to search for a page and read its `id` / `url` from the result.
