"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, Users, GamepadIcon, Plus, UserPlus, IndianRupee, BarChart2, LayoutDashboard, User, ListOrdered, Package } from "lucide-react"
import { GameManagement } from "@/components/game-management"
import { UserManagement } from "@/components/user-management"
import { SessionManagement } from "@/components/session-management"
import { OngoingSessions } from "@/components/ongoing-sessions"
import { SessionLogs } from "@/components/session-logs"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { AreaChart, Area, CartesianGrid, XAxis, YAxis } from "recharts"
import { ProductManagement } from "@/components/product-management"
import { CostCalculator } from "@/components/cost-calculator"
import { useRouter, useSearchParams } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("dashboard")
  const [games, setGames] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // On mount, read tab from URL
  useEffect(() => {
    const urlTab = searchParams.get('tab');
    if (urlTab && typeof urlTab === 'string') {
      setActiveTab(urlTab);
    }
  }, [searchParams]);

  // On tab change, update URL
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace('?' + params.toString(), { scroll: false });
  };

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      // Fetch games from API
      const gamesRes = await fetch("/api/game")
      const gamesData = await gamesRes.json()
      // Fetch users from API
      const usersRes = await fetch("/api/user")
      const usersData = await usersRes.json()
      // Fetch sessions from API
      const sessionsRes = await fetch("/api/session")
      const sessionsData = await sessionsRes.json()
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

  function isToday(dateString: string) {
    const date = new Date(dateString)
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const todaysCompletedSessions = completedSessions.filter(
    (session) => session.end_time && isToday(session.end_time)
  )

  const totalRevenue = todaysCompletedSessions.reduce((sum, session) => {
    return sum + calculateAmount(session)
  }, 0)

  function calculateAmount(session: any) {
    if (!session.end_time) return 0
    const startTime = new Date(session.start_time)
    const endTime = new Date(session.end_time)
    const durationMs = endTime.getTime() - startTime.getTime()
    const durationMinutes = durationMs / (1000 * 60)
    const ratePerMinute = session.game_rate_type === "hour" ? session.game_rate / 60 : session.game_rate / 30
    return Math.round(durationMinutes * ratePerMinute)
  }

  function getCurrentAmount(session: any) {
    const startTime = new Date(session.start_time)
    const currentTime = new Date()
    const durationMs = currentTime.getTime() - startTime.getTime()
    const durationMinutes = durationMs / (1000 * 60)
    const ratePerMinute = session.game_rate_type === "hour" ? session.game_rate / 60 : session.game_rate / 30
    return Math.round(durationMinutes * ratePerMinute)
  }

  // Helper to format date as YYYY-MM-DD
  function formatDate(date: Date) {
    return date.toISOString().slice(0, 10)
  }

  // Prepare daily revenue data for current month and last 30 days
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const last30Days = new Date(now)
  last30Days.setDate(now.getDate() - 29)

  // Group completed sessions by day
  const dailyRevenueMap: Record<string, number> = {}
  completedSessions.forEach((session) => {
    if (session.end_time) {
      const day = formatDate(new Date(session.end_time))
      dailyRevenueMap[day] = (dailyRevenueMap[day] || 0) + calculateAmount(session)
    }
  })

  // Data for current month
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const monthData = Array.from({ length: daysInMonth }, (_, i) => {
    const day = new Date(now.getFullYear(), now.getMonth(), i + 1)
    const key = formatDate(day)
    return { date: key, revenue: dailyRevenueMap[key] || 0 }
  })

  // Data for last 30 days
  const last30Data = Array.from({ length: 30 }, (_, i) => {
    const day = new Date(last30Days)
    day.setDate(last30Days.getDate() + i)
    const key = formatDate(day)
    return { date: key, revenue: dailyRevenueMap[key] || 0 }
  })

  // Calculate total revenue for the current month
  const totalRevenueThisMonth = monthData.reduce((sum, day) => sum + day.revenue, 0)

  // Utility to format number as Indian Rupee with commas
  function formatINR(amount: number) {
    return amount.toLocaleString('en-IN')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Any Issues, Call Guru...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        {/* App Name Header */}
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Garena Games</h1>
        {/* Navigation */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <Button variant={activeTab === "dashboard" ? "default" : "outline"} onClick={() => handleTabChange("dashboard")}> 
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
          <Button variant={activeTab === "sessions" ? "default" : "outline"} onClick={() => handleTabChange("sessions")}> 
            <Clock className="h-4 w-4 mr-2" />
            Sessions
          </Button>
          <Button variant={activeTab === "games" ? "default" : "outline"} onClick={() => handleTabChange("games")}> 
            <GamepadIcon className="h-4 w-4 mr-2" />
            Manage Games
          </Button>
          <Button variant={activeTab === "users" ? "default" : "outline"} onClick={() => handleTabChange("users")}> 
            <User className="h-4 w-4 mr-2" />
            Users
          </Button>
          <Button variant={activeTab === "logs" ? "default" : "outline"} onClick={() => handleTabChange("logs")}> 
            <ListOrdered className="h-4 w-4 mr-2" />
            Session Logs
          </Button>
          <Button variant={activeTab === "extras" ? "default" : "outline"} onClick={() => handleTabChange("extras")}> 
            <Package className="h-4 w-4 mr-2" />
            Extras
          </Button>
          <Button variant={activeTab === "cost-calculator" ? "default" : "outline"} onClick={() => handleTabChange("cost-calculator")}> 
            <IndianRupee className="h-4 w-4 mr-2" />
            Cost Calculator
          </Button>
        </div>

        {/* Dashboard */}
        {activeTab === "dashboard" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-6 w-6 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{users.filter((u) => u.is_active).length}</div>
                  <p className="text-xs text-muted-foreground">Active users</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Games</CardTitle>
                  <GamepadIcon className="h-6 w-6 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{games.filter((g) => g.is_active).length}</div>
                  <p className="text-xs text-muted-foreground">Active games available</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
                  <Clock className="h-6 w-6 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{activeSessions.length}</div>
                  <p className="text-xs text-muted-foreground">Currently playing</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
                  <IndianRupee className="h-6 w-6 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{formatINR(totalRevenue)}</div>
                  <p className="text-xs text-muted-foreground">From completed sessions</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue This Month</CardTitle>
                  <BarChart2 className="h-6 w-6 text-indigo-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{formatINR(totalRevenueThisMonth)}</div>
                  <p className="text-xs text-muted-foreground">All completed sessions this month</p>
                </CardContent>
              </Card>
            </div>
            {/* Revenue Charts */}
            <div className="flex flex-col gap-6 mb-8">
              <Card className="@container/card">
                <CardHeader>
                  <CardTitle>Revenue This Month</CardTitle>
                  <p className="text-muted-foreground text-xs">Daily revenue for {now.toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                  <ChartContainer config={{ revenue: { label: "Revenue", color: "var(--primary)" } }} className="aspect-auto h-[250px] w-full">
                    <AreaChart data={monthData} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="fillRevenueMonth" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} tickFormatter={(value) => {
                        const date = new Date(value)
                        return date.getDate().toString()
                      }} />
                      <YAxis domain={[0, 'auto']} tickLine={false} axisLine={false} tickMargin={8} />
                      <ChartTooltip cursor={false} content={<ChartTooltipContent labelFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })} indicator="dot" />} />
                      <Area dataKey="revenue" type="monotone" fill="url(#fillRevenueMonth)" stroke="var(--primary)" />
                    </AreaChart>
                  </ChartContainer>
                </CardContent>
              </Card>
              <Card className="@container/card">
                <CardHeader>
                  <CardTitle>Revenue Last 30 Days</CardTitle>
                  <p className="text-muted-foreground text-xs">Daily revenue for the last 30 days</p>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                  <ChartContainer config={{ revenue: { label: "Revenue", color: "var(--primary)" } }} className="aspect-auto h-[250px] w-full">
                    <AreaChart data={last30Data} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="fillRevenue30" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} tickFormatter={(value) => {
                        const date = new Date(value)
                        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      }} />
                      <YAxis domain={[0, 'auto']} tickLine={false} axisLine={false} tickMargin={8} />
                      <ChartTooltip cursor={false} content={<ChartTooltipContent labelFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })} indicator="dot" />} />
                      <Area dataKey="revenue" type="monotone" fill="url(#fillRevenue30)" stroke="var(--primary)" />
                    </AreaChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </>
        )}
        {activeTab === "cost-calculator" && (
          <CostCalculator games={games} />
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
        {activeTab === "extras" && <ProductManagement />}
      </div>
    </div>
  )
}
