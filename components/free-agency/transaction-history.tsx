"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, RefreshCw, Plus, Minus, RefreshCw as ReplaceIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TransactionHistoryProps {
  teamId?: string
  seasonId: string
}

export function TransactionHistory({ teamId, seasonId }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTransactions()
  }, [teamId, seasonId])

  const loadTransactions = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        season_id: seasonId,
        limit: "50",
      })
      if (teamId) params.append("team_id", teamId)

      const response = await fetch(`/api/free-agency/transactions?${params}`)
      const data = await response.json()

      if (data.success) {
        setTransactions(data.transactions || [])
      }
    } catch (error) {
      console.error("Error loading transactions:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      approved: "default",
      processed: "default",
      rejected: "destructive",
    }
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "addition":
        return <Plus className="h-4 w-4" />
      case "drop_only":
        return <Minus className="h-4 w-4" />
      case "replacement":
        return <ReplaceIcon className="h-4 w-4" />
      default:
        return null
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>View all free agency transactions</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadTransactions} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No transactions found
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Transaction</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="text-sm">
                    {new Date(tx.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{tx.team_name || "Unknown"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getTransactionIcon(tx.transaction_type)}
                      <span className="capitalize">{tx.transaction_type}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {tx.dropped_pokemon_name && (
                        <div className="text-sm text-muted-foreground">
                          Drop: <span className="font-medium">{tx.dropped_pokemon_name}</span>{" "}
                          ({tx.dropped_points}pts)
                        </div>
                      )}
                      {tx.added_pokemon_name && (
                        <div className="text-sm">
                          Add: <span className="font-medium">{tx.added_pokemon_name}</span>{" "}
                          ({tx.added_points}pts)
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(tx.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
