# Coach Onboarding – Notion “View full guide” feature

The coach onboarding flow (Dashboard → Onboarding) can show a **“View full guide in Notion”** button when a Notion page is configured. The app fetches the page URL (and title) from the Notion API and links to it.

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
