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
import type { Game, User, Session } from "@/types/domain";

interface SessionManagementProps {
  games: Game[]
  users: User[]
  sessions: Session[]
  onDataChange: () => void
  calculateAmount: (session: Session) => number
  getCurrentAmount: (session: Session) => number
}

export function SessionManagement({ games, users, sessions, onDataChange, calculateAmount, getCurrentAmount }: SessionManagementProps) {
  const [isStartDialogOpen, setIsStartDialogOpen] = useState(false)
  const [selectedGameId, setSelectedGameId] = useState("")
  const [selectedUserId, setSelectedUserId] = useState("")
  const [playerName, setPlayerName] = useState("")
  const [loading, setLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [products, setProducts] = useState<any[]>([])
  const [extrasModalSession, setExtrasModalSession] = useState<any>(null)
  const [selectedProductId, setSelectedProductId] = useState<string>("")
  const [extras, setExtras] = useState<{ productId: number, name: string, price: number, quantity: number }[]>([])
  const [extrasLoading, setExtrasLoading] = useState(false)
  // Add state for selected pricing model
  const [selectedPriceIndex, setSelectedPriceIndex] = useState<number | null>(null)
  // Add state for selected pricing model after 6PM
  const [selectedPriceIndexAfter6pm, setSelectedPriceIndexAfter6pm] = useState<number | null>(null)

  // Remove hardcoded simulated time logic
  // Use real current time for all calculations
  const [simulatedCurrentTime, setSimulatedCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setSimulatedCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load products from localStorage for Extras modal
  useEffect(() => {
    const stored = localStorage.getItem("products")
    if (stored) {
      setProducts(JSON.parse(stored))
    } else {
      setProducts([])
    }
  }, [])

  // Commented out DB/API code for LS-only mode
  // useEffect(() => {
  //   fetch('/api/product').then(res => res.json()).then(setProducts)
  // }, [])

  const saveSessionsLS = (newSessions: any[]) => {
    localStorage.setItem("sessions", JSON.stringify(newSessions))
    // setLocalSessions(newSessions) // This line is removed as per the new_code
    onDataChange()
  }

  const displaySessions = sessions

  // Start session via API
  const handleStartSession = async () => {
    if (!selectedGameId || !selectedUserId || selectedPriceIndex === null) return
    // If after 6PM pricing is required, ensure it's selected and different from before 6PM
    const game = games.find(g => g.id.toString() === selectedGameId)
    const price = game?.prices[selectedPriceIndex]
    let priceAfter6pm = null
    if ((game?.prices.length ?? 0) > 1 && selectedPriceIndexAfter6pm !== null) {
      priceAfter6pm = game.prices[selectedPriceIndexAfter6pm]
    }
    setLoading(true)
    try {
      // Use real current time for session start
      const now = new Date();
      await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: Number(selectedUserId),
          game_id: Number(selectedGameId),
          price_name: price.name,
          price_value: price.price,
          start_time: now.toISOString(),
          switch_pricing_at_6pm: !!priceAfter6pm,
          price_name_after_6pm: priceAfter6pm?.name,
          price_value_after_6pm: priceAfter6pm?.price,
        })
      })
      setIsStartDialogOpen(false)
      onDataChange()
    } finally {
      setLoading(false)
    }
  }

  // End session via API
  const handleEndSession = async (sessionId: number, endData: any = {}) => {
    // Block ending if simulatedCurrentTime is before session.start_time
    const session = sessions.find(s => s.id === sessionId);
    if (session && simulatedCurrentTime < new Date(session.start_time)) {
      toast.error('Cannot end session before it has started!');
      return;
    }
    setLoading(true)
    try {
      await fetch(`/api/session/${sessionId}/end`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...endData, end_time: simulatedCurrentTime.toISOString() })
      })
      onDataChange()
    } finally {
      setLoading(false)
    }
  }

  // Delete session via API
  const handleDeleteSession = async (sessionId: number) => {
    setLoading(true)
    try {
      await fetch('/api/session', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sessionId })
      })
      onDataChange()
    } finally {
      setLoading(false)
    }
  }

  const openExtrasModal = (session: any) => {
    setExtrasModalSession(session)
    setExtras([])
    setSelectedProductId("")
  }

  const handleAddExtra = () => {
    if (!selectedProductId) return
    const product = products.find((p: any) => p.id === Number(selectedProductId))
    if (!product) return
    if (extras.some(e => e.productId === product.id)) return // prevent duplicates
    setExtras([...extras, { productId: product.id, name: product.name, price: product.price, quantity: 1 }])
    setSelectedProductId("")
  }

  const handleExtrasChange = (productId: number, quantity: number) => {
    setExtras((prev) => prev.map((e) => e.productId === productId ? { ...e, quantity: Math.max(1, quantity) } : e))
  }

  const handleRemoveExtra = (productId: number) => {
    setExtras((prev) => prev.filter((e) => e.productId !== productId))
  }

  // Add back handleEndSessionWithExtras for LS-only mode
  const handleEndSessionWithExtras = async () => {
    if (!extrasModalSession) return
    setExtrasLoading(true)
    try {
      // Map extras to include name and price for each extra
      const selectedExtras = extras.map(e => {
        const product = products.find((p: any) => p.id === e.productId)
        return {
          productId: e.productId,
          name: product ? product.name : e.name,
          price: product ? product.price : e.price,
          quantity: e.quantity
        }
      })
      await fetch(`/api/session/${extrasModalSession.id}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extras: selectedExtras })
      })
      onDataChange()
      closeExtrasModal()
      toast.success('Session ended successfully!')
    } catch (error) {
      toast.error('Error ending session')
      console.error('Error ending session:', error)
    } finally {
      setExtrasLoading(false)
    }
  }

  // Commented out DB/API code for LS-only mode
  // const handleEndSession = async (sessionId: number) => {
  //   if (storageMode === "ls") {
  //     const newSessions = localSessions.map(s => s.id === sessionId ? { ...s, is_active: false, end_time: new Date().toISOString() } : s)
  //     saveSessionsLS(newSessions)
  //     toast.success('Session ended successfully!')
  //     return
  //   }
  //   try {
  //     setLoading(true)
  //     const res = await fetch(`/api/session/${sessionId}/end`, {
  //       method: 'PUT',
  //     })
  //     if (!res.ok) throw new Error('Failed to end session')
  //     toast.success('Session ended successfully!')
  //     onDataChange()
  //   } catch (error) {
  //     toast.error('Error ending session')
  //     console.error('Error ending session:', error)
  //   } finally {
  //     setLoading(false)
  //   }
  // }

  const formatDuration = (startTime: string, endTime?: string, isActive?: boolean) => {
    const start = new Date(startTime)
    // For active sessions, use currentTime for live duration
    const end = isActive ? simulatedCurrentTime : (endTime ? new Date(endTime) : new Date())
    const durationMs = end.getTime() - start.getTime()

    const hours = Math.floor(durationMs / (1000 * 60 * 60))
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((durationMs % (1000 * 60)) / 1000)

    return `${hours}h ${minutes}m ${seconds}s`
  }

  const getCurrentAmountOld = (session: Session) => {
    if (!session.is_active) return calculateAmount(session)

    const currentTime = new Date()
    const duration = (currentTime.getTime() - new Date(session.start_time).getTime()) / (1000 * 60)
    const ratePerMinute = session.games?.rate_type === "hour"
      ? (session.games?.rate ?? 0) / 60
      : (session.games?.rate ?? 0) / 30

    return Math.round(duration * ratePerMinute)
  }

  // Correct live amount calculation for active sessions, matching backend logic
  const getLiveSessionAmount = (session: any) => {
    const start = new Date(session.start_time);
    const now = simulatedCurrentTime;
    const switchTime = new Date(start);
    switchTime.setHours(18, 0, 0, 0); // 6:00 PM
    let beforeSec = 0, afterSec = 0;
    if (session.switch_pricing_at_6pm && (session.game_rate_after_6pm || session.game_rate_type_after_6pm)) {
      if (now <= switchTime) {
        beforeSec = Math.max(0, (now.getTime() - start.getTime()) / 1000);
      } else if (start >= switchTime) {
        afterSec = Math.max(0, (now.getTime() - start.getTime()) / 1000);
      } else {
        beforeSec = Math.max(0, (switchTime.getTime() - start.getTime()) / 1000);
        afterSec = Math.max(0, (now.getTime() - switchTime.getTime()) / 1000);
      }
      const beforeRate = session.game_rate || 0;
      const afterRate = session.game_rate_after_6pm || 0;
      const beforeAmount = Math.round((beforeSec / 3600) * beforeRate);
      const afterAmount = Math.round((afterSec / 3600) * afterRate);
      return Math.max(0, beforeAmount + afterAmount);
    } else {
      const durationSec = Math.max(0, (now.getTime() - start.getTime()) / 1000);
      let amount = 0;
      if (session.game_rate_type === 'hour') {
        amount = Math.round((durationSec / 3600) * (session.game_rate || 0));
      } else if (session.game_rate_type === '30min') {
        amount = Math.round((durationSec / 1800) * (session.game_rate || 0));
      }
      return Math.max(0, amount);
    }
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

    // Parse bill details for extras
    let extrasRows = ''
    let extrasTotal = 0
    let grandTotal = amount
    if (session.bill_details) {
      try {
        const details = typeof session.bill_details === 'string' ? JSON.parse(session.bill_details) : session.bill_details
        if (details.extras && Array.isArray(details.extras) && details.extras.length > 0) {
          extrasRows = details.extras.map((extra: any) =>
            `<tr><td style=\"padding: 6px 0; color: #555;\">${extra.name} x${extra.quantity}</td><td style=\"padding: 6px 0; text-align: right; color: #222;\">₹${extra.price} x ${extra.quantity} = ₹${extra.total}</td></tr>`
          ).join('')
          extrasTotal = details.extrasTotal || details.extras.reduce((sum: number, e: any) => sum + (e.total || 0), 0)
          grandTotal = (details.total || (amount + extrasTotal))
        }
      } catch {}
    }

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
            <tr><td style="padding: 6px 0; color: #555;">Game Amount</td><td style="padding: 6px 0; text-align: right; color: #222;">₹${amount}</td></tr>
            ${extrasRows}
            ${extrasRows ? `<tr><td style=\"padding: 6px 0; color: #555; font-weight: bold;\">Extras Total</td><td style=\"padding: 6px 0; text-align: right; color: #222; font-weight: bold;\">₹${extrasTotal}</td></tr>` : ''}
            <tr><td colspan="2" style="border-top: 1px solid #e2e8f0; padding-top: 12px;"></td></tr>
            <tr><td style="padding: 10px 0; font-size: 1.1rem; font-weight: bold; color: #1a202c;">Grand Total</td><td style="padding: 10px 0; text-align: right; font-size: 1.1rem; font-weight: bold; color: #16a34a;">₹${grandTotal}</td></tr>
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

  const closeExtrasModal = () => {
    setExtrasModalSession(null)
    setExtras([])
    setSelectedProductId("")
  }

  // Only show ongoing sessions
  const ongoingSessions = displaySessions.filter((session) => session.is_active)

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
                <Select value={selectedGameId} onValueChange={value => {
                  setSelectedGameId(value)
                  setSelectedPriceIndex(null)
                  setSelectedPriceIndexAfter6pm(null) // Reset after game change
                }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a game" />
                  </SelectTrigger>
                  <SelectContent>
                    {games
                      .map((game) => (
                        <SelectItem key={game.id} value={game.id.toString()}>
                          {game.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedGameId && (
                <div className="grid gap-2 w-full">
                  <Label htmlFor="pricing">Select Pricing Model</Label>
                  <Select value={selectedPriceIndex !== null ? selectedPriceIndex.toString() : ""} onValueChange={v => setSelectedPriceIndex(Number(v))}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a pricing model" />
                    </SelectTrigger>
                    <SelectContent>
                      {games.find(g => g.id.toString() === selectedGameId)?.prices.map((p, idx) => (
                        <SelectItem key={idx} value={idx.toString()}>{p.name} - ₹{p.price}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {/* Optional select for pricing after 6PM if multiple pricing models exist */}
              {selectedGameId && (games.find(g => g.id.toString() === selectedGameId)?.prices.length ?? 0) > 1 && (
                <div className="grid gap-2 w-full">
                  <Label htmlFor="pricingAfter6pm">Pricing Model after 6PM</Label>
                  <Select value={selectedPriceIndexAfter6pm !== null ? selectedPriceIndexAfter6pm.toString() : ""} onValueChange={v => setSelectedPriceIndexAfter6pm(Number(v))}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose pricing model after 6PM" />
                    </SelectTrigger>
                    <SelectContent>
                      {games.find(g => g.id.toString() === selectedGameId)?.prices.map((p, idx) => (
                        <SelectItem key={idx} value={idx.toString()}>{p.name} - ₹{p.price}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
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
                  <div className="text-base font-semibold text-gray-700 mb-1">{session.game_name || session.games?.title || 'Unknown Game'}</div>
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
                    ₹{session.is_active ? getLiveSessionAmount(session) : calculateAmount(session)}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                {session.is_active ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => openExtrasModal(session)}
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

      {/* Extras Modal */}
      <Dialog open={!!extrasModalSession} onOpenChange={closeExtrasModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Extras (Drinks/Snacks)</DialogTitle>
            <DialogDescription>Add products to the bill. Adjust quantity or remove as needed.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mb-2">
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {products.filter(p => !extras.some(e => e.productId === p.id)).map(product => (
                  <SelectItem key={product.id} value={product.id.toString()}>{product.name} (₹{product.price})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAddExtra} disabled={!selectedProductId}>Add</Button>
          </div>
          <div className="space-y-2">
            {extras.length === 0 && <div className="text-gray-500">No products added.</div>}
            {extras.map((extra) => (
              <div key={extra.productId} className="flex items-center gap-2">
                <span className="w-32">{extra.name}</span>
                <span className="w-16">₹{extra.price}</span>
                <Input
                  type="number"
                  min={1}
                  value={extra.quantity}
                  onChange={e => handleExtrasChange(extra.productId, Number(e.target.value))}
                  className="w-20"
                />
                <Button variant="destructive" size="sm" onClick={() => handleRemoveExtra(extra.productId)}>Remove</Button>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={handleEndSessionWithExtras} disabled={extrasLoading}>
              {extrasLoading ? "Saving..." : "End Session & Add Extras"}
            </Button>
            <Button variant="outline" onClick={closeExtrasModal} disabled={extrasLoading}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
