"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, Users, GamepadIcon, Plus, UserPlus } from "lucide-react"
import { GameManagement } from "@/components/game-management"
import { UserManagement } from "@/components/user-management"
import { SessionManagement } from "@/components/session-management"
import { OngoingSessions } from "@/components/ongoing-sessions"
import { SessionLogs } from "@/components/session-logs"

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("dashboard")
  const [games, setGames] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      // Load games
      const gamesRes = await fetch('/api/game')
      const gamesData = gamesRes.ok ? await gamesRes.json() : []
      // Load users
      const usersRes = await fetch('/api/user')
      const usersData = usersRes.ok ? await usersRes.json() : []
      // Load sessions with related data
      const sessionsRes = await fetch('/api/logs')
      const sessionsData = sessionsRes.ok ? await sessionsRes.json() : []
      setGames(gamesData)
      setUsers(usersData)
      setSessions(sessionsData)
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  const activeSessions = sessions.filter((session) => session.is_active)
  const completedSessions = sessions.filter((session) => !session.is_active)

  const totalRevenue = completedSessions.reduce((sum, session) => {
    return sum + calculateAmount(session)
  }, 0)

  function calculateAmount(session: any) {
    if (!session.end_time || !session.games) return 0

    const startTime = new Date(session.start_time)
    const endTime = new Date(session.end_time)
    const durationMs = endTime.getTime() - startTime.getTime()
    const durationMinutes = durationMs / (1000 * 60)

    const ratePerMinute = session.games.rate_type === "hour" ? session.games.rate / 60 : session.games.rate / 30

    return Math.round(durationMinutes * ratePerMinute)
  }

  function getCurrentAmount(session: any) {
    if (!session.games) return 0

    const startTime = new Date(session.start_time)
    const currentTime = new Date()
    const durationMs = currentTime.getTime() - startTime.getTime()
    const durationMinutes = durationMs / (1000 * 60)

    const ratePerMinute = session.games.rate_type === "hour" ? session.games.rate / 60 : session.games.rate / 30

    return Math.round(durationMinutes * ratePerMinute)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Garena Games...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Garena Games Management</h1>
          <p className="text-gray-600">Cloud-based game center management system</p>
        </div>

        {/* Navigation */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <Button variant={activeTab === "dashboard" ? "default" : "outline"} onClick={() => setActiveTab("dashboard")}>
            Dashboard
          </Button>
          <Button variant={activeTab === "users" ? "default" : "outline"} onClick={() => setActiveTab("users")}>
            <UserPlus className="h-4 w-4 mr-2" />
            Users
          </Button>
          <Button variant={activeTab === "games" ? "default" : "outline"} onClick={() => setActiveTab("games")}>
            Manage Games
          </Button>
          <Button variant={activeTab === "sessions" ? "default" : "outline"} onClick={() => setActiveTab("sessions")}>
            Sessions
          </Button>
          <Button variant={activeTab === "logs" ? "default" : "outline"} onClick={() => setActiveTab("logs")}>
            Session Logs
          </Button>
        </div>

        {/* Dashboard */}
        {activeTab === "dashboard" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{users.filter((u) => u.is_active).length}</div>
                <p className="text-xs text-muted-foreground">Active users</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Games</CardTitle>
                <GamepadIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{games.filter((g) => g.is_active).length}</div>
                <p className="text-xs text-muted-foreground">Active games available</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeSessions.length}</div>
                <p className="text-xs text-muted-foreground">Currently playing</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
                <Plus className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{totalRevenue}</div>
                <p className="text-xs text-muted-foreground">From completed sessions</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Content based on active tab */}
        {activeTab === "users" && <UserManagement users={users} onDataChange={loadData} />}
        {activeTab === "games" && <GameManagement games={games} onDataChange={loadData} />}
        {activeTab === "sessions" && (
          <SessionManagement
            games={games}
            users={users}
            sessions={sessions}
            onDataChange={loadData}
            calculateAmount={calculateAmount}
            getCurrentAmount={getCurrentAmount}
          />
        )}
        {activeTab === "logs" && (
          <SessionLogs games={games} users={users} calculateAmount={calculateAmount} />
        )}
      </div>
    </div>
  )
}
