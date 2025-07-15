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
    return sessions
      .filter((session) => !session.is_active) // Only ended sessions
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

        // Status filter
        if (filters.status === "active" && !session.is_active) {
          return false
        }
        if (filters.status === "completed" && session.is_active) {
          return false
        }

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

    const billContent = `
      <div style="max-width: 400px; margin: 40px auto; border: 2px solid #222; border-radius: 16px; padding: 32px 24px; font-family: 'Segoe UI', Arial, sans-serif; background: #fff; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
        <h2 style="text-align: center; font-size: 2rem; font-weight: bold; margin-bottom: 8px; letter-spacing: 2px; color: #1a202c;">GARENA GAMES</h2>
        <div style="text-align: center; font-size: 1.1rem; color: #4a5568; margin-bottom: 18px;">Session Bill</div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 18px;">
          <tbody>
            <tr><td style="padding: 6px 0; color: #555;">Player</td><td style="padding: 6px 0; text-align: right; color: #222; font-weight: 500;">${userName}</td></tr>
            <tr><td style="padding: 6px 0; color: #555;">Game</td><td style="padding: 6px 0; text-align: right; color: #222; font-weight: 500;">${gameName}</td></tr>
            <tr><td style="padding: 6px 0; color: #555;">Start Time</td><td style="padding: 6px 0; text-align: right; color: #222;">${startTime}</td></tr>
            <tr><td style="padding: 6px 0; color: #555;">End Time</td><td style="padding: 6px 0; text-align: right; color: #222;">${endTime}</td></tr>
            <tr><td style="padding: 6px 0; color: #555;">Duration</td><td style="padding: 6px 0; text-align: right; color: #222;">${duration}</td></tr>
            <tr><td style="padding: 6px 0; color: #555;">Rate</td><td style="padding: 6px 0; text-align: right; color: #222;">₹${rate} per ${rateType}</td></tr>
            <tr><td colspan="2" style="border-top: 1px solid #e2e8f0; padding-top: 12px;"></td></tr>
            <tr><td style="padding: 10px 0; font-size: 1.1rem; font-weight: bold; color: #1a202c;">Total Amount</td><td style="padding: 10px 0; text-align: right; font-size: 1.1rem; font-weight: bold; color: #16a34a;">₹${amount}</td></tr>
          </tbody>
        </table>
        <div style="text-align: center; color: #4a5568; font-size: 1rem; margin-top: 18px;">Thank you for playing!<br/>Visit again.</div>
      </div>
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
            {sessions.map((session) => (
              <TableRow key={session.id}>
                <TableCell className="border border-gray-200">{session.users?.name || 'Unknown'}</TableCell>
                <TableCell className="border border-gray-200">{session.games?.name || 'Unknown'}</TableCell>
                <TableCell className="border border-gray-200">{new Date(session.start_time).toLocaleString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</TableCell>
                <TableCell className="border border-gray-200">{session.end_time ? new Date(session.end_time).toLocaleString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : 'Ongoing'}</TableCell>
                <TableCell className="border border-gray-200">{formatDuration(session.start_time, session.end_time)}</TableCell>
                <TableCell className="border border-gray-200">₹{session.is_active ? getCurrentAmount(session) : calculateAmount(session)}</TableCell>
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
