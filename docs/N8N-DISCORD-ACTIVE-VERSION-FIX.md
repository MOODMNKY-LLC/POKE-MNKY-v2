# Why Discord Notifications Don’t Run (n8n Active vs Draft)

## What’s going on

In n8n, the workflow that **runs** when the trigger fires is the **active version** (a snapshot). What you edit in the editor is the **draft**. They can be different.

Inspection of **Notion Draft Board → Supabase Sync** (ID: `AeazX7cYBLeNmRBJ`) shows:

| | Draft (what you edit) | Active version (what runs) |
|---|------------------------|----------------------------|
| **Discord Notification** | Has `options.embeds` (embed JSON). No `text`. | Has only `text` (plain message). **`options` is `{}` – no embeds.** |
| **Get Current Season** | `getAll` on `seasons`, filter `is_current = true`. | `operation: "select"` only (no table/filters). |
| **Upsert to Supabase** | `update` with full field mappings. | `operation: "upsert"` only (no field mappings). |

So when the **Notion trigger** runs the workflow, n8n uses the **active version**. That version has the old Discord config (text only, no embeds). If that text doesn’t send (e.g. webhook or payload issue), you see “nothing happening” for Discord even though the run succeeds.

---

## Fix: Re-activate the workflow

You need to make the **current draft** become the new **active version**:

1. Open the workflow:  
   https://aab-n8n.moodmnky.com/workflow/AeazX7cYBLeNmRBJ  
2. Turn the workflow **Off** (toggle **Active** to off).  
3. **Save** the workflow (Ctrl/Cmd+S) so the draft is saved.  
4. Turn the workflow **On** again (toggle **Active** to on).

n8n will create a new active version from the current draft. After that, when the Notion trigger runs:

- Get Current Season will use the correct query.
- Upsert to Supabase will use Update with your field mappings.
- Discord Notification will use your embed config (and any `text` you added).

---

## Optional: Fallback text on the Discord node

So that something is sent even if embed parsing fails:

1. Open the **Discord Notification** node.
2. In **Text** (or the main message field), set:
   ```text
   Draft Board Updated: {{ $json.pokemon_name || 'Unknown' }} · {{ $json.point_value ?? '?' }} pts · {{ $json.status || 'N/A' }}
   ```
3. Keep your **Embeds** (Raw JSON) as-is.
4. Save, then **re-activate** (Off → Save → On) as above.

---

## Summary

- **“Nothing happening” for Discord** is because the **running** workflow is an old snapshot (active version) with the old Discord (and possibly old Get Current Season / Upsert) config.
- **Fix:** Turn the workflow **Off**, **Save**, then turn it **On** again so the current draft (with embeds and correct nodes) becomes the active version.
