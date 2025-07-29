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
import { Skeleton } from "@/components/ui/skeleton"

interface SessionLogsProps {
  games: Game[]
  users: User[]
  calculateAmount: (session: Session) => number
}

// Utility to format number as Indian Rupee with commas
function formatINR(amount: number) {
  return amount.toLocaleString('en-IN')
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters.gameId !== "all") params.append("gameId", filters.gameId)
      if (filters.userId !== "all") params.append("userId", filters.userId)
      if (filters.dateFrom) params.append("from", filters.dateFrom)
      if (filters.dateTo) params.append("to", filters.dateTo)
      if (filters.status !== "all") params.append("status", filters.status)
      const res = await fetch(`/api/logs?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        console.log('Fetched sessions from API:', data)
        setSessions(data)
      }
      setLoading(false)
    }
    fetchLogs()
  }, [filters])

  const displaySessions = sessions

  const filteredSessions = useMemo(() => {
    // Only show completed (not active) sessions, regardless of filters
    const completed = displaySessions
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
    // Sort by start_time descending (newest first)
    completed.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
    console.log('Filtered completed sessions for logs:', completed)
    return completed
  }, [displaySessions, filters])

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

    const ratePerMinute = session.game_rate_type === "hour" ? session.game_rate / 60 : session.game_rate / 30

    return Math.round(durationMinutes * ratePerMinute)
  }

  // Helper to get total amount including extras
  function getTotalAmount(session: Session) {
    // Support LS sessions with extras
    let extrasTotal = 0
    if (session.extras && Array.isArray(session.extras) && session.extras.length > 0) {
      extrasTotal = session.extras.reduce((sum: number, e: any) => sum + (e.quantity * (e.price || 0)), 0)
      return calculateAmount(session) + extrasTotal
    }
    if (session.bill_details) {
      try {
        const details = typeof session.bill_details === 'string' ? JSON.parse(session.bill_details) : session.bill_details
        if (typeof details.total === 'number') return details.total
      } catch {}
    }
    return calculateAmount(session)
  }

  // In the logs table, use bill_details.total for the Amount display
  const getDisplayAmount = (session: any) => {
    const total = session.bill_details?.total;
    return typeof total === 'number' && !isNaN(total) ? total : 0;
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
      Total Revenue: ₹${formatINR(totalRevenue)}
      
      SESSION DETAILS:
      ${filteredSessions
        .map(
          (session) => `
      ${session.users?.name} - ${session.games?.name}
      ${new Date(session.start_time).toLocaleString()} - ${session.end_time ? new Date(session.end_time).toLocaleString() : "Ongoing"}
      Duration: ${formatDuration(session.start_time, session.end_time)}
      Amount: ₹${formatINR(session.is_active ? getCurrentAmount(session) : calculateAmount(session))}
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
    // Use robust field selection and fallbacks
    const userName = session.users?.name || 'Unknown';
    const gameName = session.game_name || session.games?.title || 'Unknown';
    const startTime = session.start_time ? new Date(session.start_time).toLocaleString() : 'Unknown';
    const endTime = session.end_time ? new Date(session.end_time).toLocaleString() : 'Ongoing';
    const duration = formatDuration(session.start_time, session.end_time);
    const breakdown = session.bill_details?.breakdown || [];
    const rateBefore6 = breakdown[0]?.rate ?? session.bill_details?.rate ?? 0;
    const rateAfter6 = breakdown[1]?.rate ?? 0;
    const rateTypeBefore6 = breakdown[0]?.rateType || session.bill_details?.rate_type || 'hour';
    const rateTypeAfter6 = breakdown[1]?.rateType || (breakdown[1] ? 'hour' : '');
    const amount = typeof session.bill_details?.total === 'number' ? session.bill_details.total : 0;

    // Calculate breakdown for before/after 6PM
    let beforeAmount = 0, beforeSec = 0, beforeRate = 0, beforeRateType = '', afterAmount = 0, afterSec = 0, afterRate = 0, afterRateType = '';
    if (breakdown.length > 0) {
      beforeAmount = breakdown[0]?.amount ?? 0;
      beforeSec = breakdown[0]?.durationSec ?? 0;
      beforeRate = breakdown[0]?.rate ?? 0;
      beforeRateType = breakdown[0]?.rateType || 'hour';
      if (breakdown[1]) {
        afterAmount = breakdown[1]?.amount ?? 0;
        afterSec = breakdown[1]?.durationSec ?? 0;
        afterRate = breakdown[1]?.rate ?? 0;
        afterRateType = breakdown[1]?.rateType || 'hour';
      }
    } else {
      // If no breakdown, use main rate for the whole session
      beforeAmount = amount;
      beforeSec = (new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / 1000;
      beforeRate = rateBefore6;
      beforeRateType = rateTypeBefore6;
    }
    const beforeMins = Math.round(beforeSec / 60);
    const afterMins = Math.round(afterSec / 60);

    // Extras
    const extras = session.bill_details?.extras || [];
    let extrasRows = '';
    if (extras.length > 0) {
      extrasRows = extras.map((extra: any) =>
        `<tr><td style="padding: 6px 0; color: #475569;">Extras - ${extra.name}</td><td style="padding: 6px 0; text-align: right; color: #222;">₹${extra.total}</td></tr>`
      ).join('');
    } else {
      extrasRows = `<tr><td style="padding: 6px 0; color: #475569;">Extras</td><td style="padding: 6px 0; text-align: right; color: #222;">₹0</td></tr>`;
    }

    // For Rate after 6PM, always show the per hour rate from session.game_rate_after_6pm if present
    const afterPerHourRate = session.game_rate_after_6pm || afterRate || 0;

    // Bill content: use two templates based on breakdown
    let billContent = '';
    if (breakdown.length > 1) {
      // Multiple prices: show before/after 6PM
      billContent = `
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
            <tr><td style="padding: 7px 0; color: #64748b;">Rate before 6PM</td><td style="padding: 7px 0; text-align: right; color: #222;"><span style="font-family: 'Comic Sans MS', 'Comic Sans', cursive; font-size: 1.08em;">₹${beforeAmount} for ${beforeMins}mins - (${beforeRate}Rs/H)</span></td></tr>
            <tr><td style="padding: 7px 0; color: #64748b;">Rate after 6PM</td><td style="padding: 7px 0; text-align: right; color: #222;"><span style="font-family: 'Comic Sans MS', 'Comic Sans', cursive; font-size: 1.08em;">₹${afterAmount} for ${afterMins}mins - (${afterPerHourRate}Rs/H)</span></td></tr>
          </tbody>
        </table>
        <div style="border-bottom: 1.5px dashed #cbd5e1; margin-bottom: 12px;"></div>
        <div style="font-size: 1.08rem; font-weight: 600; color: #334155; margin-bottom: 8px;">Bill Details</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 1.01rem;">
          <tbody>
            <tr><td style="padding: 6px 0; color: #475569;">Game Amount</td><td style="padding: 6px 0; text-align: right; color: #222;">₹${amount}</td></tr>
            ${extrasRows}
          </tbody>
        </table>
        <div style="border-bottom: 1.5px dashed #cbd5e1; margin: 18px 0 10px 0;"></div>
        <div style="font-size: 1.13rem; font-weight: bold; color: #1e293b; margin-bottom: 8px;">Grand Total</div>
        <div style="padding: 12px 0; text-align: right; font-size: 1.13rem; font-weight: bold; color: #10b981; background: #e0f2fe; border-radius: 6px;">₹${amount}</div>
        <div style="text-align: center; color: #64748b; font-size: 1.08rem; margin-top: 10px; font-family: inherit;">Thank you for playing!<br/>Visit again.</div>
      </div>
      </body></html>
      `;
    } else {
      // Single price: show only default rate
      billContent = `
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
            <tr><td style="padding: 7px 0; color: #64748b;">Rate</td><td style="padding: 7px 0; text-align: right; color: #222;">₹${beforeRate} per hour</td></tr>
          </tbody>
        </table>
        <div style="border-bottom: 1.5px dashed #cbd5e1; margin-bottom: 12px;"></div>
        <div style="font-size: 1.08rem; font-weight: 600; color: #334155; margin-bottom: 8px;">Bill Details</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 1.01rem;">
          <tbody>
            <tr><td style="padding: 6px 0; color: #475569;">Game Amount</td><td style="padding: 6px 0; text-align: right; color: #222;">₹${amount}</td></tr>
            ${extrasRows}
          </tbody>
        </table>
        <div style="border-bottom: 1.5px dashed #cbd5e1; margin: 18px 0 10px 0;"></div>
        <div style="font-size: 1.13rem; font-weight: bold; color: #1e293b; margin-bottom: 8px;">Grand Total</div>
        <div style="padding: 12px 0; text-align: right; font-size: 1.13rem; font-weight: bold; color: #10b981; background: #e0f2fe; border-radius: 6px;">₹${amount}</div>
        <div style="text-align: center; color: #64748b; font-size: 1.08rem; margin-top: 10px; font-family: inherit;">Thank you for playing!<br/>Visit again.</div>
      </div>
      </body></html>
      `;
    }

    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(billContent)
      printWindow.document.close()
      printWindow.print()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] w-full">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="text-gray-500">Loading session logs...</span>
        </div>
      </div>
    )
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
              <TableHead className="border border-gray-300">ID</TableHead>
              <TableHead className="border border-gray-300">Date</TableHead>
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
                <TableCell className="border border-gray-200">{session.id}</TableCell>
                <TableCell className="border border-gray-200">{new Date(session.start_time).toISOString().split('T')[0]}</TableCell>
                <TableCell className="border border-gray-200">{session.users?.name || 'Unknown'}</TableCell>
                <TableCell className="border border-gray-200">{session.game_name || session.games?.title || 'Unknown'}</TableCell>
                <TableCell className="border border-gray-200">{new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</TableCell>
                <TableCell className="border border-gray-200">{session.end_time ? new Date(session.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : 'Ongoing'}</TableCell>
                <TableCell className="border border-gray-200">{formatDuration(session.start_time, session.end_time)}</TableCell>
                <TableCell className="border border-gray-200">₹{formatINR(getDisplayAmount(session))}</TableCell>
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
