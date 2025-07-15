"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Play, Square, Printer } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"

interface SessionManagementProps {
  games: Game[]
  users: User[]
  sessions: Session[]
  onDataChange: () => void
  calculateAmount: (session: Session) => number
  getCurrentAmount: (session: Session) => number
}

export function SessionManagement({
  games,
  users,
  sessions,
  onDataChange,
  calculateAmount,
  getCurrentAmount,
}: SessionManagementProps) {
  const [isStartDialogOpen, setIsStartDialogOpen] = useState(false)
  const [selectedGameId, setSelectedGameId] = useState("")
  const [selectedUserId, setSelectedUserId] = useState("")
  const [playerName, setPlayerName] = useState("")
  const [loading, setLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const handleStartSession = async () => {
    if (!selectedGameId || !selectedUserId) return

    const selectedGame = games.find((game) => game.id === Number.parseInt(selectedGameId))
    const selectedUser = users.find((user) => user.id === Number.parseInt(selectedUserId))
    if (!selectedGame || !selectedUser) return

    try {
      setLoading(true)
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: selectedUser,
          game: selectedGame,
          start_time: new Date().toISOString(),
        }),
      })
      if (!res.ok) throw new Error('Failed to start session')
      toast.success('Session started successfully!')
      setSelectedGameId('')
      setSelectedUserId('')
      setIsStartDialogOpen(false)
      onDataChange()
    } catch (error) {
      toast.error('Error starting session')
      console.error('Error starting session:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEndSession = async (sessionId: number) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/session/${sessionId}/end`, {
        method: 'PUT',
      })
      if (!res.ok) throw new Error('Failed to end session')
      toast.success('Session ended successfully!')
      onDataChange()
    } catch (error) {
      toast.error('Error ending session')
      console.error('Error ending session:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (startTime: string, endTime?: string, isActive?: boolean) => {
    const start = new Date(startTime)
    // For active sessions, use currentTime for live duration
    const end = isActive ? currentTime : (endTime ? new Date(endTime) : new Date())
    const durationMs = end.getTime() - start.getTime()

    const hours = Math.floor(durationMs / (1000 * 60 * 60))
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((durationMs % (1000 * 60)) / 1000)

    return `${hours}h ${minutes}m ${seconds}s`
  }

  const getCurrentAmountOld = (session: Session) => {
    if (!session.isActive) return calculateAmount(session)

    const currentTime = new Date()
    const duration = (currentTime.getTime() - session.startTime.getTime()) / (1000 * 60)
    const ratePerMinute = session.rateType === "hour" ? session.rate / 60 : session.rate / 30

    return Math.round(duration * ratePerMinute)
  }

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

  // Only show ongoing sessions
  const ongoingSessions = sessions.filter((session) => session.is_active)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Session Management</h2>
        <Dialog open={isStartDialogOpen} onOpenChange={setIsStartDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Play className="h-4 w-4 mr-2" />
              Start Session
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start New Session</DialogTitle>
              <DialogDescription>Select a game and enter player details</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2 w-full">
                <Label htmlFor="game">Select Game</Label>
                <Select value={selectedGameId} onValueChange={setSelectedGameId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a game" />
                  </SelectTrigger>
                  <SelectContent>
                    {games
                      .filter((game) => game.is_active)
                      .map((game) => (
                        <SelectItem key={game.id} value={game.id.toString()}>
                          {game.name} - ₹{game.rate}/{game.rate_type === "30min" ? "30min" : "hr"}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2 w-full">
                <Label htmlFor="user">Select User</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users
                      .filter((user) => user.is_active)
                      .map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleStartSession} disabled={loading}>
                {loading ? "Loading..." : "Start Session"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {ongoingSessions.map((session) => (
          <Card key={session.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{session.users?.name}</CardTitle>
                  <CardDescription>{session.games?.name}</CardDescription>
                </div>
                <Badge variant={session.is_active ? "default" : "secondary"}>
                  {session.is_active ? "Playing" : "Completed"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Start Time</p>
                  <p className="font-medium">{new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">End Time</p>
                  <p className="font-medium">{session.end_time ? new Date(session.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : 'Ongoing'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Duration</p>
                  <p className="font-medium">{formatDuration(session.start_time, session.end_time, session.is_active)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Rate</p>
                  <p className="font-medium">₹{session.games?.rate}/{session.games?.rate_type === "30min" ? "30min" : "hr"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Amount</p>
                  <p className="font-medium text-green-600">
                    ₹{session.is_active ? getCurrentAmount(session) : calculateAmount(session)}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                {session.is_active ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleEndSession(session.id)}
                    disabled={loading}
                  >
                    <Square className="h-4 w-4 mr-2" />
                    {loading ? "Loading..." : "End Session"}
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => printBill(session)}>
                    <Printer className="h-4 w-4 mr-2" />
                    Print Bill
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
