# Fix: Upsert to Supabase Node Returns No Output

## The actual problem

The **Upsert to Supabase** node (operation: **Update**) runs successfully but has **no output**. The UI shows “1 item { }” — one item with an empty object. So:

- **Transform to Supabase** is fine and outputs the payload correctly.
- **Upsert to Supabase** is the step that “fails” in the sense that it produces no data for the next node.

That’s why anything after it (e.g. Discord) receives empty `$json`.

---

## Why the Supabase (Update) node has no output

1. **PostgREST** (used by Supabase) for **PATCH/Update** uses **`Prefer: return=minimal`** by default, so the API returns **no body**.
2. To get the updated row back you need **`Prefer: return=representation`**. The **n8n Supabase node does not expose this**; it only supports the default behavior.
3. So when the Update runs, the node gets an empty (or minimal) response and outputs “1 item { }”. The update itself succeeds; the node just has nothing to put in the output item.

So: the issue is the **Upsert/Update node having no output**, not the Transform. The built-in Supabase node cannot be configured to return the updated row.

---

## Fix 1: Make the “update” step return data (HTTP Request)

Replace the **Upsert to Supabase** node with an **HTTP Request** node that calls the Supabase REST API with **`Prefer: return=representation`**. Then that node will output the updated row and the rest of the flow can use `$json` as usual.

1. **Remove** the “Upsert to Supabase” node (or disconnect it).
2. **Add** an **HTTP Request** node.
3. **Configure** it:
   - **Method**: `PATCH`
   - **URL**:  
     `={{ 'https://' + $env.SUPABASE_HOST + '/rest/v1/draft_pool?season_id=eq.' + $json.season_id + '&pokemon_name=eq.' + encodeURIComponent($json.pokemon_name) }}`  
     (If you don’t have `SUPABASE_HOST` in n8n env, use the full Supabase URL, e.g. `https://YOUR_PROJECT_REF.supabase.co/rest/v1/draft_pool?season_id=eq.{{ $json.season_id }}&pokemon_name=eq.{{ encodeURIComponent($json.pokemon_name) }}`.)
   - **Authentication**: Predefined credential → Supabase (same as current).
   - **Headers**:
     - `Content-Type`: `application/json`
     - `Prefer`: `return=representation`
     - `apikey`: (from credential / env)
     - `Authorization`: `Bearer <service_role_key>` (from credential / env)
   - **Body** (JSON):  
     `{{ JSON.stringify({ pokemon_name: $json.pokemon_name, point_value: $json.point_value, status: $json.status, tera_captain_eligible: $json.tera_captain_eligible, pokemon_id: $json.pokemon_id, banned_reason: $json.banned_reason }) }}`  
     (Do **not** send `season_id` in the body if it’s in the URL filter.)

4. Connect **Transform to Supabase** → **HTTP Request** → **Send a message (Discord)**.  
The HTTP Request node will output the updated row, so Discord can use `$json.pokemon_name`, etc.

**Caveat:** If no row matches, PATCH affects 0 rows and may return an empty array `[]`. You may need a small Code node after the HTTP Request to turn that into one item (e.g. fallback to Transform data) so Discord always gets one item. For the “update only” case, the above is enough.

---

## Fix 2: Keep Supabase node, re‑inject data after it (Code node)

If you want to keep the **Upsert to Supabase** node as-is and only fix the fact that the **next** node has no input:

1. **Add a Code** node between **Upsert to Supabase** and **Send a message**.
2. In the Code node:
   ```js
   return [{ json: $('Transform to Supabase').item.json }];
   ```
3. Connect: **Upsert to Supabase** → **Code** → **Send a message**.

So the “update” step still has no output, but the **pipeline** after it has one item again (the Transform payload). Discord can keep using `$json.pokemon_name`, etc. No need to change the Discord node.

---

## Fix 3: Don’t change the pipeline; fix only the Discord node

If you don’t want to add or replace nodes:

- In the **Send a message (Discord)** node, use **`$('Transform to Supabase').item.json.xxx`** instead of **`$json.xxx`** for every field (pokemon_name, point_value, status, etc.).

Then Discord no longer depends on the Upsert node’s output. The Upsert node still has no output; only the Discord node is adjusted.

---

## Summary

| What’s wrong | The **Upsert to Supabase (Update)** node runs but returns no output (“1 item { }”) because the n8n Supabase node doesn’t request the updated row from PostgREST. |
| Best fix if you want that step to have output | **Fix 1:** Replace it with an HTTP Request that does PATCH with `Prefer: return=representation`. |
| Minimal change | **Fix 2:** Add a Code node after Upsert that outputs `$('Transform to Supabase').item.json`. Or **Fix 3:** In Discord only, reference `$('Transform to Supabase').item.json.*`. |

Transform is not the issue; the step that fails to populate data for the next node is the Upsert (Update) node.
