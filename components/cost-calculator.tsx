import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { differenceInMinutes, format } from "date-fns"

interface CostCalculatorProps {
  games: any[]
}

export function CostCalculator({ games }: CostCalculatorProps) {
  const [selectedGameId, setSelectedGameId] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")

  const selectedGame = games.find((g) => g.id.toString() === selectedGameId)

  let duration = 0
  let cost = 0
  if (selectedGame && startTime && endTime) {
    const start = new Date(`1970-01-01T${startTime}`)
    const end = new Date(`1970-01-01T${endTime}`)
    duration = differenceInMinutes(end, start)
    if (duration > 0) {
      const rate = selectedGame.rate
      const rateType = selectedGame.rate_type
      const ratePerMinute = rateType === "hour" ? rate / 60 : rate / 30
      cost = Math.round(duration * ratePerMinute)
    }
  }

  return (
    <Card className="max-w-xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Cost Calculator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label>Select Game</Label>
          <Select value={selectedGameId} onValueChange={setSelectedGameId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a game" />
            </SelectTrigger>
            <SelectContent>
              {games.map((game) => (
                <SelectItem key={game.id} value={game.id.toString()}>
                  {game.name} (₹{game.rate}/{game.rate_type === "hour" ? "hr" : "30min"})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2 grid-cols-2">
          <div>
            <Label>Start Time</Label>
            <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
          </div>
          <div>
            <Label>End Time</Label>
            <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
          </div>
        </div>
        <div className="pt-4">
          <div className="text-lg font-medium">Duration: <span className="font-mono">{duration > 0 ? duration : "-"} min</span></div>
          <div className="text-lg font-medium">Cost: <span className="font-mono">₹{cost > 0 ? cost : "-"}</span></div>
        </div>
      </CardContent>
    </Card>
  )
} 