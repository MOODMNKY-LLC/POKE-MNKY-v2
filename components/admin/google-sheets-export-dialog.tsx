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
  format: z.enum(["draft-board", "table"]).default("draft-board"),
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
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false)
  const [pendingExport, setPendingExport] = useState<FormValues | null>(null)
  const [existingSheetInfo, setExistingSheetInfo] = useState<{ exists: boolean; rowCount?: number; lastModified?: string } | null>(null)
  const [checkingSheet, setCheckingSheet] = useState(false)
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
      format: "draft-board",
    },
  })

  async function onSubmit(values: FormValues) {
    // If action is "add" (overwrite), check if sheet exists and show confirmation dialog
    if (values.action === "add") {
      setCheckingSheet(true)
      try {
        // Extract spreadsheet ID from URL if needed
        const spreadsheetId = extractSpreadsheetId(values.spreadsheet_id)
        if (!spreadsheetId) {
          toast({
            title: "Invalid Spreadsheet ID",
            description: "Please provide a valid Google Sheets URL or ID",
            variant: "destructive",
          })
          setCheckingSheet(false)
          return
        }

        // Check if sheet exists and get info about it
        const sheetInfo = await checkSheetExists(spreadsheetId, values.sheet_name)
        setExistingSheetInfo(sheetInfo)
        setPendingExport(values)
        setShowOverwriteConfirm(true)
      } catch (error: any) {
        toast({
          title: "Error Checking Sheet",
          description: error.message || "Could not check if sheet exists",
          variant: "destructive",
        })
      } finally {
        setCheckingSheet(false)
      }
      return
    }

    // Proceed with export (create action - safe)
    await performExport(values)
  }

  async function checkSheetExists(spreadsheetIdOrUrl: string, sheetName: string): Promise<{ exists: boolean; row_count?: number; last_modified?: string; approximate_data_rows?: number }> {
    try {
      const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl)
      if (!spreadsheetId) {
        return { exists: false }
      }

      // Call an API endpoint to check sheet info
      const response = await fetch("/api/admin/pokemon/export-sheets/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          spreadsheet_id: spreadsheetId,
          sheet_name: sheetName,
        }),
      })

      if (!response.ok) {
        return { exists: false }
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error("[GoogleSheetsExportDialog] Error checking sheet:", error)
      return { exists: false }
    }
  }

  async function performExport(values: FormValues) {
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

      // Choose endpoint based on format
      const endpoint = values.format === "table" 
        ? "/api/admin/pokemon/export-sheets-table"
        : "/api/admin/pokemon/export-sheets"
      
      console.log("[GoogleSheetsExportDialog] Exporting with:", {
        endpoint,
        spreadsheet_id: spreadsheetId,
        sheet_name: values.sheet_name,
        season_id: values.season_id,
        action: values.action,
        format: values.format,
      })

      const response = await fetch(endpoint, {
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
      setShowOverwriteConfirm(false)
      setPendingExport(null)
      setExistingSheetInfo(null)
      const currentDefaultSeasonId = seasons.find((s) => s.is_current)?.id || seasons[0]?.id || ""
      form.reset({
        spreadsheet_id: defaultSpreadsheetId,
        sheet_name: "Draft Board",
        season_id: currentDefaultSeasonId,
        action: "create",
        format: "draft-board",
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

  function handleConfirmOverwrite() {
    if (pendingExport) {
      setShowOverwriteConfirm(false)
      performExport(pendingExport)
      setPendingExport(null)
      setExistingSheetInfo(null)
    }
  }

  function handleCancelOverwrite() {
    setShowOverwriteConfirm(false)
    setPendingExport(null)
    setExistingSheetInfo(null)
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
              name="format"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Export Format</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || "draft-board"}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="draft-board">
                        📋 Draft Board Format (point value columns)
                      </SelectItem>
                      <SelectItem value="table">
                        📊 Table Format (like admin panel)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Draft Board: Organized by point values. Table: Traditional spreadsheet with all columns.
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
                        ✅ Create new sheet (recommended - safe)
                      </SelectItem>
                      <SelectItem value="add">
                        ⚠️ Overwrite existing sheet (will clear all data)
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

      {/* Overwrite Confirmation Dialog */}
      <Dialog open={showOverwriteConfirm} onOpenChange={setShowOverwriteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
              <span>⚠️</span> Confirm Overwrite
            </DialogTitle>
            <DialogDescription>
              You are about to <strong>completely overwrite</strong> the sheet "{pendingExport?.sheet_name}" in the spreadsheet.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {/* Existing Sheet Info */}
            {existingSheetInfo?.exists && (
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-4">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                  📊 Current Sheet Information (Will Be Deleted):
                </p>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li><strong>Sheet Name:</strong> "{pendingExport?.sheet_name}"</li>
                  {existingSheetInfo.row_count !== undefined && (
                    <li><strong>Total Rows:</strong> {existingSheetInfo.row_count.toLocaleString()} rows</li>
                  )}
                  {existingSheetInfo.approximate_data_rows !== undefined && (
                    <li><strong>Rows with Data:</strong> ~{existingSheetInfo.approximate_data_rows.toLocaleString()} rows</li>
                  )}
                  {existingSheetInfo.last_modified && (
                    <li><strong>Last Modified:</strong> {existingSheetInfo.last_modified}</li>
                  )}
                  <li className="mt-2 pt-2 border-t border-blue-300 dark:border-blue-700 text-orange-700 dark:text-orange-300 font-medium">
                    ⚠️ <strong>ALL of this data ({existingSheetInfo.row_count?.toLocaleString() || 'all'} rows) will be PERMANENTLY DELETED</strong> and replaced with the new draft pool export
                  </li>
                </ul>
              </div>
            )}

            {existingSheetInfo && !existingSheetInfo.exists && (
              <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ℹ️ Sheet "{pendingExport?.sheet_name}" does not exist. It will be created.
                </p>
              </div>
            )}

            {/* Warning Box */}
            <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-md p-4">
              <p className="text-sm text-orange-800 dark:text-orange-200 font-medium mb-2">
                ⚠️ Warning: This action cannot be undone automatically
              </p>
              <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1 list-disc list-inside">
                <li>All existing data in "{pendingExport?.sheet_name}" will be permanently deleted</li>
                <li>You can recover it from Google Sheets version history (File → Version history → See version history)</li>
                <li>Consider using "Create new sheet" instead to preserve existing data</li>
              </ul>
            </div>

            {/* What Will Be Created */}
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md p-4">
              <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
                ✅ What will be created:
              </p>
              <ul className="text-sm text-green-800 dark:text-green-200 space-y-1 list-disc list-inside">
                <li>Draft Board format with point value columns (20-1 points)</li>
                <li>Banned Pokémon list</li>
                <li>Tera Banned Pokémon list</li>
                <li>All available Pokémon organized by point value</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelOverwrite}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmOverwrite}
              disabled={loading || checkingSheet}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  Yes, Overwrite Sheet
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
