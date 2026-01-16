'use client'

import * as React from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

interface ResponsiveTableProps {
  children: React.ReactNode
  className?: string
  mobileCardView?: boolean
  mobileCardTitle?: (row: any) => React.ReactNode
  mobileCardContent?: (row: any) => React.ReactNode
}

/**
 * ResponsiveTable - Wraps a table and provides mobile card view fallback
 * 
 * Usage:
 * ```tsx
 * <ResponsiveTable
 *   mobileCardView={true}
 *   mobileCardTitle={(row) => row.name}
 *   mobileCardContent={(row) => <div>...</div>}
 * >
 *   <Table>
 *     <TableHeader>...</TableHeader>
 *     <TableBody>
 *       {data.map(row => (
 *         <TableRow key={row.id} data-row={JSON.stringify(row)}>
 *           ...
 *         </TableRow>
 *       ))}
 *     </TableBody>
 *   </Table>
 * </ResponsiveTable>
 * ```
 */
export function ResponsiveTable({
  children,
  className,
  mobileCardView = true,
  mobileCardTitle,
  mobileCardContent,
}: ResponsiveTableProps) {
  const isMobile = useIsMobile()
  const [rows, setRows] = React.useState<any[]>([])

  React.useEffect(() => {
    if (isMobile && mobileCardView) {
      // Extract row data from table rows
      const tableElement = document.querySelector('[data-slot="table"]')
      if (tableElement) {
        const tableRows = Array.from(tableElement.querySelectorAll('tbody tr'))
        const rowData = tableRows.map((row) => {
          const rowDataAttr = row.getAttribute('data-row')
          if (rowDataAttr) {
            try {
              return JSON.parse(rowDataAttr)
            } catch {
              return null
            }
          }
          // Fallback: extract data from cells
          const cells = Array.from(row.querySelectorAll('td'))
          return {
            cells: cells.map((cell) => cell.textContent?.trim() || ''),
          }
        })
        setRows(rowData.filter(Boolean))
      }
    }
  }, [isMobile, mobileCardView])

  if (isMobile && mobileCardView && rows.length > 0 && mobileCardTitle && mobileCardContent) {
    return (
      <div className={cn('space-y-4', className)}>
        {rows.map((row, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="text-lg">{mobileCardTitle(row)}</CardTitle>
            </CardHeader>
            <CardContent>{mobileCardContent(row)}</CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return <div className={className}>{children}</div>
}

/**
 * Simple wrapper that just adds horizontal scroll on mobile
 */
export function MobileScrollTable({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0', className)}>
      {children}
    </div>
  )
}
