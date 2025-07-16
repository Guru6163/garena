"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Printer, Filter, Download, Calendar } from "lucide-react"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import type { Game, User, Session } from "@/types/domain";

interface SessionLogsProps {
  games: Game[]
  users: User[]
  calculateAmount: (session: Session) => number
}

export function SessionLogs({ games, users, calculateAmount }: SessionLogsProps) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [filters, setFilters] = useState({
    gameId: "all",
    userId: "all",
    dateFrom: "",
    dateTo: "",
    status: "all", // all, active, completed
  })

  useEffect(() => {
    const fetchLogs = async () => {
      const params = new URLSearchParams()
      if (filters.gameId !== "all") params.append("gameId", filters.gameId)
      if (filters.userId !== "all") params.append("userId", filters.userId)
      if (filters.dateFrom) params.append("from", filters.dateFrom)
      if (filters.dateTo) params.append("to", filters.dateTo)
      if (filters.status !== "all") params.append("status", filters.status)
      const res = await fetch(`/api/logs?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setSessions(data)
      }
    }
    fetchLogs()
  }, [filters])

  const filteredSessions = useMemo(() => {
    // Only show completed (not active) sessions, regardless of filters
    return sessions
      .filter((session) => !session.is_active)
      .filter((session) => {
        // Game filter
        if (filters.gameId !== "all" && session.game_id.toString() !== filters.gameId) {
          return false
        }

        // User filter
        if (filters.userId !== "all" && session.user_id.toString() !== filters.userId) {
          return false
        }

        // Date range filter
        if (filters.dateFrom) {
          const sessionDate = new Date(session.start_time).toISOString().split("T")[0]
          if (sessionDate < filters.dateFrom) {
            return false
          }
        }

        if (filters.dateTo) {
          const sessionDate = new Date(session.start_time).toISOString().split("T")[0]
          if (sessionDate > filters.dateTo) {
            return false
          }
        }

        // Status filter: already filtered out active sessions above

        return true
      })
  }, [sessions, filters])

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime)
    const end = endTime ? new Date(endTime) : new Date()
    const durationMs = end.getTime() - start.getTime()

    const hours = Math.floor(durationMs / (1000 * 60 * 60))
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((durationMs % (1000 * 60)) / 1000)

    return `${hours}h ${minutes}m ${seconds}s`
  }

  const getCurrentAmount = (session: Session) => {
    if (!session.games) return 0

    const startTime = new Date(session.start_time)
    const currentTime = new Date()
    const durationMs = currentTime.getTime() - startTime.getTime()
    const durationMinutes = durationMs / (1000 * 60)

    const ratePerMinute = session.games.rate_type === "hour" ? session.games.rate / 60 : session.games.rate / 30

    return Math.round(durationMinutes * ratePerMinute)
  }

  // Helper to get total amount including extras
  function getTotalAmount(session: Session) {
    if (session.bill_details) {
      try {
        const details = typeof session.bill_details === 'string' ? JSON.parse(session.bill_details) : session.bill_details
        if (typeof details.total === 'number') return details.total
      } catch {}
    }
    return calculateAmount(session)
  }

  const clearFilters = () => {
    setFilters({
      gameId: "all",
      userId: "all",
      dateFrom: "",
      dateTo: "",
      status: "all",
    })
  }

  const exportToCSV = () => {
    const headers = ["Date", "User", "Game", "Start Time", "End Time", "Duration", "Amount", "Status"]
    const csvData = filteredSessions.map((session) => [
      new Date(session.start_time).toLocaleDateString(),
      session.users?.name || "Unknown",
      session.games?.name || "Unknown",
      new Date(session.start_time).toLocaleTimeString(),
      session.end_time ? new Date(session.end_time).toLocaleTimeString() : "Ongoing",
      formatDuration(session.start_time, session.end_time),
      session.is_active ? getCurrentAmount(session) : calculateAmount(session),
      session.is_active ? "Active" : "Completed",
    ])

    const csvContent = [headers, ...csvData].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `session-logs-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const printReport = () => {
    const totalRevenue = filteredSessions
      .filter((s) => !s.is_active)
      .reduce((sum, session) => sum + calculateAmount(session), 0)

    const reportContent = `
      GARENA GAMES - SESSION REPORT
      =============================
      
      Generated: ${new Date().toLocaleString()}
      Total Sessions: ${filteredSessions.length}
      Active Sessions: ${filteredSessions.filter((s) => s.is_active).length}
      Completed Sessions: ${filteredSessions.filter((s) => !s.is_active).length}
      Total Revenue: ₹${totalRevenue}
      
      SESSION DETAILS:
      ${filteredSessions
        .map(
          (session) => `
      ${session.users?.name} - ${session.games?.name}
      ${new Date(session.start_time).toLocaleString()} - ${session.end_time ? new Date(session.end_time).toLocaleString() : "Ongoing"}
      Duration: ${formatDuration(session.start_time, session.end_time)}
      Amount: ₹${session.is_active ? getCurrentAmount(session) : calculateAmount(session)}
      `,
        )
        .join("\n")}
    `

    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(`<pre>${reportContent}</pre>`)
      printWindow.document.close()
      printWindow.print()
    }
  }

  // Print Bill function (copied and adapted from session-management.tsx)
  const printBill = (session: Session) => {
    const amount = calculateAmount(session)
    const duration = formatDuration(session.start_time, session.end_time)
    const userName = session.users?.name || 'Unknown'
    const gameName = session.games?.name || 'Unknown'
    const startTime = new Date(session.start_time).toLocaleString()
    const endTime = session.end_time ? new Date(session.end_time).toLocaleString() : 'Ongoing'
    const rate = session.games?.rate
    const rateType = session.games?.rate_type === '30min' ? '30 minutes' : 'hour'

    // Parse bill details for extras
    let extrasRows = ''
    let extrasTotal = 0
    let grandTotal = amount
    if (session.bill_details) {
      try {
        const details = typeof session.bill_details === 'string' ? JSON.parse(session.bill_details) : session.bill_details
        if (details.extras && Array.isArray(details.extras) && details.extras.length > 0) {
          extrasRows = details.extras.map((extra: any) =>
            `<tr><td style="padding: 6px 0; color: #555;">${extra.name} x${extra.quantity}</td><td style="padding: 6px 0; text-align: right; color: #222;">₹${extra.price} x ${extra.quantity} = ₹${extra.total}</td></tr>`
          ).join('')
          extrasTotal = details.extrasTotal || details.extras.reduce((sum: number, e: any) => sum + (e.total || 0), 0)
          grandTotal = (details.total || (amount + extrasTotal))
        }
      } catch {}
    }

    const billContent = `
      <html><head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
      </head><body style="margin:0;padding:0;">
      <div style="max-width: 440px; margin: 40px auto; border: 2px solid #222; border-radius: 18px; padding: 36px 28px; font-family: 'Inter', 'Roboto', 'Arial', 'Helvetica Neue', Arial, sans-serif; background: #f9fafb; box-shadow: 0 6px 32px rgba(0,0,0,0.10);">
        <h2 style="text-align: center; font-size: 2.2rem; font-weight: bold; margin-bottom: 10px; letter-spacing: 2px; color: #1a202c; font-family: inherit;">GARENA GAMES</h2>
        <div style="text-align: center; font-size: 1.15rem; color: #6366f1; margin-bottom: 22px; font-weight: 600;">Session Bill</div>
        <div style="border-bottom: 1.5px dashed #cbd5e1; margin-bottom: 18px;"></div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 1.04rem;">
          <tbody>
            <tr><td style="padding: 7px 0; color: #64748b;">Player</td><td style="padding: 7px 0; text-align: right; color: #222; font-weight: 600;">${userName}</td></tr>
            <tr><td style="padding: 7px 0; color: #64748b;">Game</td><td style="padding: 7px 0; text-align: right; color: #222; font-weight: 600;">${gameName}</td></tr>
            <tr><td style="padding: 7px 0; color: #64748b;">Start Time</td><td style="padding: 7px 0; text-align: right; color: #222;">${startTime}</td></tr>
            <tr><td style="padding: 7px 0; color: #64748b;">End Time</td><td style="padding: 7px 0; text-align: right; color: #222;">${endTime}</td></tr>
            <tr><td style="padding: 7px 0; color: #64748b;">Duration</td><td style="padding: 7px 0; text-align: right; color: #222;">${duration}</td></tr>
            <tr><td style="padding: 7px 0; color: #64748b;">Rate</td><td style="padding: 7px 0; text-align: right; color: #222;">₹${rate} per ${rateType}</td></tr>
          </tbody>
        </table>
        <div style="border-bottom: 1.5px dashed #cbd5e1; margin-bottom: 12px;"></div>
        <div style="font-size: 1.08rem; font-weight: 600; color: #334155; margin-bottom: 8px;">Bill Details</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 1.01rem;">
          <tbody>
            <tr><td style="padding: 6px 0; color: #475569;">Game Amount</td><td style="padding: 6px 0; text-align: right; color: #222;">₹${amount}</td></tr>
            ${extrasRows}
            ${extrasRows ? `<tr><td style="padding: 6px 0; color: #475569; font-weight: bold;">Extras Total</td><td style="padding: 6px 0; text-align: right; color: #222; font-weight: bold;">₹${extrasTotal}</td></tr>` : ''}
            <tr><td colspan="2" style="border-top: 1px solid #e2e8f0; padding-top: 12px;"></td></tr>
            <tr><td style="padding: 12px 0; font-size: 1.13rem; font-weight: bold; color: #1e293b;">Grand Total</td><td style="padding: 12px 0; text-align: right; font-size: 1.13rem; font-weight: bold; color: #10b981; background: #e0f2fe; border-radius: 6px;">₹${grandTotal}</td></tr>
          </tbody>
        </table>
        <div style="border-bottom: 1.5px dashed #cbd5e1; margin: 18px 0 10px 0;"></div>
        <div style="text-align: center; color: #64748b; font-size: 1.08rem; margin-top: 10px; font-family: inherit;">Thank you for playing!<br/>Visit again.</div>
      </div>
      </body></html>
    `

    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(billContent)
      printWindow.document.close()
      printWindow.print()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Session Logs</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={printReport}>
            <Printer className="h-4 w-4 mr-2" />
            Print Report
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="grid gap-2 w-full">
              <Label>Game</Label>
              <Select value={filters.gameId} onValueChange={(value) => setFilters({ ...filters, gameId: value })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Games" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Games</SelectItem>
                  {games.map((game) => (
                    <SelectItem key={game.id} value={game.id.toString()}>
                      {game.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2 w-full">
              <Label>User</Label>
              <Select value={filters.userId} onValueChange={(value) => setFilters({ ...filters, userId: value })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2 w-full">
              <Label>From Date</Label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              />
            </div>

            <div className="grid gap-2 w-full">
              <Label>To Date</Label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              />
            </div>

            <div className="grid gap-2 w-full">
              <Label>Status</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sessions</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="completed">Completed Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-between items-center mt-4">
            <p className="text-sm text-gray-600">
              Showing {filteredSessions.length} of {sessions.length} sessions
            </p>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Session List */}
      <div className="overflow-x-auto">
        <Table className="border border-gray-300">
          <TableHeader>
            <TableRow>
              <TableHead className="border border-gray-300">User</TableHead>
              <TableHead className="border border-gray-300">Game</TableHead>
              <TableHead className="border border-gray-300">Start Time</TableHead>
              <TableHead className="border border-gray-300">End Time</TableHead>
              <TableHead className="border border-gray-300">Duration</TableHead>
              <TableHead className="border border-gray-300">Amount</TableHead>
              <TableHead className="border border-gray-300">Status</TableHead>
              <TableHead className="border border-gray-300">Bill</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSessions.map((session) => (
              <TableRow key={session.id}>
                <TableCell className="border border-gray-200">{session.users?.name || 'Unknown'}</TableCell>
                <TableCell className="border border-gray-200">{session.games?.name || 'Unknown'}</TableCell>
                <TableCell className="border border-gray-200">{new Date(session.start_time).toLocaleString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</TableCell>
                <TableCell className="border border-gray-200">{session.end_time ? new Date(session.end_time).toLocaleString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : 'Ongoing'}</TableCell>
                <TableCell className="border border-gray-200">{formatDuration(session.start_time, session.end_time)}</TableCell>
                <TableCell className="border border-gray-200">₹{getTotalAmount(session)}</TableCell>
                <TableCell className="border border-gray-200">{session.is_active ? 'Active' : 'Completed'}</TableCell>
                <TableCell className="border border-gray-200">
                  <Button variant="outline" size="sm" onClick={() => printBill(session)}>
                    <Printer className="h-4 w-4 mr-1" /> Print Bill
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredSessions.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Sessions Found</h3>
          <p className="text-gray-600">Try adjusting your filters to see more results</p>
        </div>
      )}
    </div>
  )
}
