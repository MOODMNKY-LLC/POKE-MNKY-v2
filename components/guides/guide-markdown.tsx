import Link from "next/link"
import ReactMarkdown from "react-markdown"
import { cn } from "@/lib/utils"

interface GuideMarkdownProps {
  content: string
  className?: string
  /** Strip a leading H1 that duplicates the page title. */
  stripLeadingH1?: boolean
}

function stripFirstH1(markdown: string): string {
  return markdown.replace(/^#\s+[^\n]+\n+/, "")
}

/**
 * Readable markdown renderer for coach guides (mobile/PWA friendly).
 * Uses explicit Tailwind classes because @tailwindcss/typography is not installed.
 */
export function GuideMarkdown({
  content,
  className,
  stripLeadingH1 = true,
}: GuideMarkdownProps) {
  const source = stripLeadingH1 ? stripFirstH1(content) : content

  return (
    <article
      className={cn(
        "guide-prose min-w-0 space-y-4 text-[0.95rem] leading-relaxed text-foreground sm:text-base",
        "[&_h2]:mt-8 [&_h2]:scroll-mt-24 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-balance",
        "[&_h3]:mt-6 [&_h3]:scroll-mt-24 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:tracking-tight",
        "[&_h4]:mt-4 [&_h4]:text-base [&_h4]:font-semibold",
        "[&_p]:text-pretty [&_p]:text-muted-foreground [&_p]:leading-relaxed",
        "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5",
        "[&_ol]:my-3 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5",
        "[&_li]:text-muted-foreground [&_li]:leading-relaxed",
        "[&_strong]:font-semibold [&_strong]:text-foreground",
        "[&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4",
        "[&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground",
        "[&_hr]:my-8 [&_hr]:border-border",
        "[&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:bg-muted/60 [&_pre]:p-3 [&_pre]:text-xs sm:[&_pre]:text-sm",
        "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_code]:break-words",
        "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit",
        "[&_table]:w-full [&_table]:min-w-[28rem] [&_table]:border-collapse [&_table]:text-left [&_table]:text-sm",
        "[&_th]:border-b [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:font-semibold",
        "[&_td]:border-b [&_td]:border-border/60 [&_td]:px-3 [&_td]:py-2 [&_td]:align-top [&_td]:text-muted-foreground",
        className,
      )}
    >
      <div className="overflow-x-auto [-webkit-overflow-scrolling:touch]">
        <ReactMarkdown
          components={{
            a: ({ href, children, ...props }) => {
              if (href?.startsWith("/")) {
                return (
                  <Link href={href} {...props}>
                    {children}
                  </Link>
                )
              }
              return (
                <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                  {children}
                </a>
              )
            },
            table: ({ children }) => (
              <div className="my-4 overflow-x-auto rounded-lg border">
                <table>{children}</table>
              </div>
            ),
          }}
        >
          {source}
        </ReactMarkdown>
      </div>
    </article>
  )
}
