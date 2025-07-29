"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Square, Clock, Printer } from "lucide-react"

interface OngoingSessionsProps {
  sessions: any[] // Changed from Session[] to any[] as supabase is removed
  onDataChange: () => void
  getCurrentAmount: (session: any) => number // Changed from Session to any
}

// Add a SessionCard subcomponent for reuse
function SessionCard({ session, currentTime, onEnd, onPrint, loading }: any) {
  const formatDuration = (startTime: string) => {
    const start = new Date(startTime)
    const end = currentTime || new Date()
    const durationMs = end.getTime() - start.getTime()
    const hours = Math.floor(durationMs / (1000 * 60 * 60))
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((durationMs % (1000 * 60)) / 1000)
    return `${hours}h ${minutes}m ${seconds}s`
  }
  return (
    <Card key={session.id} className="border-l-4 border-l-green-500">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {session.users?.name}
              <Badge variant="default" className="text-xs">LIVE</Badge>
            </CardTitle>
            <CardDescription>{session.games?.name}</CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-green-600">₹{session.game_rate}</p>
            <p className="text-sm text-gray-600">Current Amount</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-600">Start Time</p>
            <p className="font-medium">{new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Duration</p>
            <p className="font-medium text-blue-600">{formatDuration(session.start_time)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Rate</p>
            <p className="font-medium">₹{session.game_rate}/{session.game_rate_type === "30min" ? "30min" : "hr"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Rate/Min</p>
            <p className="font-medium">₹{(session.game_rate_type === "hour" ? session.game_rate / 60 : session.game_rate / 30).toFixed(2)}</p>
          </div>
        </div>
        {/* Pricing Model Switch Info */}
        {session.switch_pricing_at_6pm && (
          <div className="bg-yellow-50 border border-yellow-300 rounded p-3 mb-3">
            <div className="font-semibold text-yellow-800 mb-1 flex items-center gap-2">
              <span>Pricing Model Switched</span>
              <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-700">After 6PM</Badge>
            </div>
            <div className="text-sm text-gray-700">
              <div className="mb-1">
                <span className="font-medium">Default:</span> ₹{session.game_rate} / {session.game_rate_type === "30min" ? "30min" : "hr"}
              </div>
              <div>
                <span className="font-medium">After 6PM:</span> ₹{session.game_rate_after_6pm || "-"} / {session.game_rate_type_after_6pm === "30min" ? "30min" : session.game_rate_type_after_6pm === "hour" ? "hr" : "-"}
              </div>
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <Button variant="destructive" size="sm" onClick={() => onEnd(session.id)} disabled={loading}>
            <Square className="h-4 w-4 mr-2" />
            {loading ? "Loading..." : "End Session"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => onPrint(session)}>
            <Printer className="h-4 w-4 mr-2" />
            Print Current Bill
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function OngoingSessions({ getCurrentAmount }: OngoingSessionsProps) {
  const [sessions, setSessions] = useState<any[]>([]) // Changed from Session[] to any[]
  const [loading, setLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  const fetchOngoing = async () => {
    setLoading(true)
    const res = await fetch('/api/logs?status=active')
    if (res.ok) {
      const data = await res.json()
      setSessions(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    fetchOngoing()
  }, [])

  const handleEndSession = async (sessionId: number) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/session/${sessionId}/end`, {
        method: 'PATCH',
      })
      if (!res.ok) throw new Error('Failed to end session')
      await fetchOngoing()
    } catch (error) {
      console.error('Error ending session:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (startTime: string) => {
    const start = new Date(startTime)
    const durationMs = currentTime.getTime() - start.getTime()

    const hours = Math.floor(durationMs / (1000 * 60 * 60))
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((durationMs % (1000 * 60)) / 1000)

    return `${hours}h ${minutes}m ${seconds}s`
  }

  const printCurrentBill = (session: any) => { // Changed from Session to any
    const amount = getCurrentAmount(session)
    const duration = formatDuration(session.start_time)

    const billContent = `
      GARENA GAMES - CURRENT BILL
      ===========================
      
      Player: ${session.users?.name}
      Game: ${session.games?.name}
      
      Start Time: ${new Date(session.start_time).toLocaleString()}
      Current Time: ${currentTime.toLocaleString()}
      Duration: ${duration}
      
      Rate: ₹${session.game_rate} per ${session.game_rate_type === "30min" ? "30 minutes" : "hour"}
      
      Current Amount: ₹${amount}
      
      *Session is still ongoing*
    `

    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(`<pre>${billContent}</pre>`)
      printWindow.document.close()
      printWindow.print()
    }
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Ongoing Sessions</h3>
        <p className="text-gray-600">All players have finished their games</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Ongoing Sessions</h2>
        <Badge variant="default" className="text-sm">
          {sessions.length} Active
        </Badge>
      </div>

      <div className="grid gap-4">
        {sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            currentTime={currentTime}
            onEnd={handleEndSession}
            onPrint={printCurrentBill}
            loading={loading}
          />
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">Real-time Billing Example</h3>
        <p className="text-sm text-blue-700">
          Cricket at ₹1400/hour = ₹23.33/minute. If someone plays for 49 minutes, they pay ₹1,143.
        </p>
      </div>
    </div>
  )
}
