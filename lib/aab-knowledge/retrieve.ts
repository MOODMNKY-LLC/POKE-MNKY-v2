import { retrieveCall } from "../../agents/aab-notion/retrieve.mjs"
import { fallbackAnswer, citationPrefix } from "../../agents/aab-notion/answer.mjs"
import { allowedToolNames, type KnowledgeRole } from "./gate"

export { fallbackAnswer, citationPrefix }

export async function retrieveForApp(
  role: KnowledgeRole,
  tool: string,
  args: Record<string, unknown> = {},
  env: Record<string, string | undefined> = process.env,
) {
  if (!allowedToolNames(role).includes(tool)) {
    return { error: "permission_denied" as const, tool, role }
  }
  const retrieved = await retrieveCall({
    role,
    name: tool,
    args,
    token: env.NOTION_APP_READONLY_TOKEN || "",
  })
  if (retrieved && typeof retrieved === "object" && "secret" in retrieved) {
    const rest = { ...(retrieved as Record<string, unknown>) }
    delete rest.secret
    return rest
  }
  return retrieved
}
