"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Loader2, FileSpreadsheet, Plus } from "lucide-react"
import { extractSpreadsheetId } from "@/lib/utils/google-sheets"
import { createBrowserClient } from "@/lib/supabase/client"

interface Season {
  id: string
  name: string
  is_current: boolean
}

const formSchema = z.object({
  spreadsheet_id: z.string().min(1, "Spreadsheet ID or URL is required"),
  sheet_name: z.string().min(1, "Sheet name is required"),
  season_id: z.string().min(1, "Season is required"),
  action: z.enum(["create", "add"]),
})

type FormValues = z.infer<typeof formSchema>

interface GoogleSheetsExportDialogProps {
  onExportComplete?: () => void
}

export function GoogleSheetsExportDialog({ onExportComplete }: GoogleSheetsExportDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [seasons, setSeasons] = useState<Season[]>([])
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; name?: string } | null>(null)
  const [seasonsLoading, setSeasonsLoading] = useState(true)
  const { toast } = useToast()

  // Get default spreadsheet ID from environment variable
  const defaultSpreadsheetId = process.env.NEXT_PUBLIC_GOOGLE_SHEET_ID || ""

  // Fetch seasons and current user on mount
  useEffect(() => {
    async function fetchData() {
      const supabase = createBrowserClient()
      
      // Fetch seasons
      const { data: seasonsData } = await supabase
        .from("seasons")
        .select("id, name, is_current")
        .order("created_at", { ascending: false })
      
      if (seasonsData) {
        setSeasons(seasonsData)
      }
      
      // Fetch current user
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Get user metadata (name might be in user_metadata or profiles table)
        // Try to fetch from profiles table, but don't fail if it doesn't exist or RLS blocks it
        let profileName: string | undefined
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, username")
            .eq("id", user.id)
            .single()
          
          profileName = profile?.display_name || profile?.username
        } catch (error) {
          // Profile table might not be accessible due to RLS or doesn't exist
          console.warn("[GoogleSheetsExportDialog] Could not fetch profile:", error)
        }
        
        setCurrentUser({
          id: user.id,
          email: user.email || "",
          name: profileName || user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.display_name,
        })
      }
      
      setSeasonsLoading(false)
    }
    
    fetchData()
  }, [])

  // Get default season ID (current season or first season)
  const defaultSeasonId = seasons.find((s) => s.is_current)?.id || seasons[0]?.id || ""

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      spreadsheet_id: defaultSpreadsheetId,
      sheet_name: "Draft Board",
      season_id: defaultSeasonId,
      action: "create",
    },
  })

  async function onSubmit(values: FormValues) {
    setLoading(true)
    try {
      // Extract spreadsheet ID from URL if needed
      const spreadsheetId = extractSpreadsheetId(values.spreadsheet_id)
      if (!spreadsheetId) {
        toast({
          title: "Invalid Spreadsheet ID",
          description: "Please provide a valid Google Sheets URL or ID",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      const response = await fetch("/api/admin/pokemon/export-sheets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          spreadsheet_id: spreadsheetId,
          sheet_name: values.sheet_name,
          season_id: values.season_id,
          action: values.action,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to export to Google Sheets")
      }

      toast({
        title: "Export Successful",
        description: data.message,
      })

      // Open the sheet in a new tab
      if (data.sheet_url) {
        window.open(data.sheet_url, "_blank")
      }

      setOpen(false)
      const currentDefaultSeasonId = seasons.find((s) => s.is_current)?.id || seasons[0]?.id || ""
      form.reset({
        spreadsheet_id: defaultSpreadsheetId,
        sheet_name: "Draft Board",
        season_id: currentDefaultSeasonId,
        action: "create",
      })
      onExportComplete?.()
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message || "An error occurred while exporting",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Reset form with default values when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      form.reset({
        spreadsheet_id: defaultSpreadsheetId,
        sheet_name: "Draft Board",
        season_id: defaultSeasonId,
        action: "create",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Export to Google Sheets
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Draft Pool to Google Sheets</DialogTitle>
          <DialogDescription>
            Export the current draft pool to a Google Sheet in the Draft Board format. You can
            create a new sheet or add to an existing spreadsheet.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="spreadsheet_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Google Spreadsheet</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Spreadsheet ID or URL"
                      {...field}
                      disabled={loading}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter the Google Sheets URL or spreadsheet ID. The service account must have
                    access to this spreadsheet. Defaults to the configured spreadsheet.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sheet_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sheet Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Draft Board" {...field} disabled={loading} />
                  </FormControl>
                  <FormDescription>
                    Name of the sheet to create or update. If the sheet exists and action is
                    "add", it will be updated.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="season_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Season</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={loading || seasonsLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={seasonsLoading ? "Loading seasons..." : "Select season"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {seasons.map((season) => (
                        <SelectItem key={season.id} value={season.id}>
                          {season.name} {season.is_current && "(Current)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select the season to export draft pool data from.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="action"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Action</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select action" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="create">
                        Create new sheet (will create if doesn't exist)
                      </SelectItem>
                      <SelectItem value="add">
                        Add to existing sheet (will fail if sheet doesn't exist)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose whether to create a new sheet or update an existing one.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel>Created By</FormLabel>
              <FormControl>
                <Input
                  value={currentUser?.name || currentUser?.email || "Loading..."}
                  disabled
                  className="bg-muted"
                />
              </FormControl>
              <FormDescription>
                The authenticated user who is creating this export.
              </FormDescription>
            </FormItem>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Export
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
