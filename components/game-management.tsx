"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Trash2, Edit, Plus } from "lucide-react"
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

interface GameManagementProps {
  games: any[] // Changed from Game[] to any[] as supabase is removed
  onDataChange: () => void
}

export function GameManagement({ games, onDataChange }: GameManagementProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingGame, setEditingGame] = useState<any | null>(null) // Changed from Game to any
  const [formData, setFormData] = useState({
    name: "",
    rate: "",
    rateType: "hour" as "30min" | "hour",
  })
  const [loading, setLoading] = useState(false)

  const handleAddGame = async () => {
    const numericRate = Number(formData.rate.trim())
    if (!formData.name.trim() || Number.isNaN(numericRate) || numericRate <= 0) {
      toast.error('Please enter a positive number for the rate.')
      return
    }

    try {
      setLoading(true)
      const res = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name.trim(), rate: numericRate, rate_type: formData.rateType }),
      })
      if (!res.ok) throw new Error('Failed to add game')
      toast.success('Game added successfully!')
      setFormData({ name: '', rate: '', rateType: 'hour' })
      setIsAddDialogOpen(false)
      onDataChange()
    } catch (error) {
      toast.error('Error adding game')
      console.error('Error adding game:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEditGame = async () => {
    if (!editingGame || !formData.name || !formData.rate) return

    try {
      setLoading(true)
      const res = await fetch('/api/game', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingGame.id, name: formData.name, rate: Number.parseInt(formData.rate), rate_type: formData.rateType }),
      })
      if (!res.ok) throw new Error('Failed to update game')
      toast.success('Game updated successfully!')
      setEditingGame(null)
      setFormData({ name: '', rate: '', rateType: 'hour' })
      onDataChange()
    } catch (error) {
      toast.error('Error updating game')
      console.error('Error updating game:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteGame = async (gameId: number) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/game?id=${gameId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        if (data.error && data.error.includes('sessions exist')) {
          toast.error('Cannot delete game: sessions exist for this game.')
          return
        }
        throw new Error('Failed to delete game')
      }
      toast.success('Game deleted successfully!')
      onDataChange()
    } catch (error) {
      toast.error('Error deleting game')
      console.error('Error deleting game:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleGameStatus = async (gameId: number, currentStatus: boolean) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/game/${gameId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus }),
      })
      if (!res.ok) throw new Error('Failed to update game status')
      toast.success('Game status updated!')
      onDataChange()
    } catch (error) {
      toast.error('Error updating game status')
      console.error("Error updating game status:", error)
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (game: any) => { // Changed from Game to any
    setEditingGame(game)
    setFormData({
      name: game.name,
      rate: game.rate.toString(),
      rateType: game.rate_type,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Game Management</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={loading}>
              <Plus className="h-4 w-4 mr-2" />
              Add Game
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Game</DialogTitle>
              <DialogDescription>Add a new game with pricing information</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Game Name</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Enter game name" className="w-full" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rate">Rate (₹)</Label>
                <Input id="rate" type="number" value={formData.rate} onChange={(e) => setFormData({ ...formData, rate: e.target.value })} placeholder="Enter rate" className="w-full" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rateType">Rate Type</Label>
                <Select value={formData.rateType} onValueChange={(value: "30min" | "hour") => setFormData({ ...formData, rateType: value })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30min">Per 30 Minutes</SelectItem>
                    <SelectItem value="hour">Per Hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddGame} disabled={loading}>
                {loading ? "Adding..." : "Add Game"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {games.map((game) => (
          <Card key={game.id} className={`${!game.is_active ? "opacity-60" : ""}`}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{game.name}</CardTitle>
                  <CardDescription>
                    ₹{game.rate} per {game.rate_type === "30min" ? "30 minutes" : "hour"}
                  </CardDescription>
                </div>
                <Badge variant={game.is_active ? "default" : "secondary"}>
                  {game.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button onClick={() => startEdit(game)} disabled={loading} variant="outline" size="sm">Edit</Button>
                <Button onClick={() => handleDeleteGame(game.id)} disabled={loading} variant="destructive" size="sm">Delete</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingGame} onOpenChange={() => setEditingGame(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Game</DialogTitle>
            <DialogDescription>Update game information</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Game Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-rate">Rate (₹)</Label>
              <Input
                id="edit-rate"
                type="number"
                value={formData.rate}
                onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-rateType">Rate Type</Label>
              <Select
                value={formData.rateType}
                onValueChange={(value: "30min" | "hour") => setFormData({ ...formData, rateType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30min">Per 30 Minutes</SelectItem>
                  <SelectItem value="hour">Per Hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleEditGame} disabled={loading}>
              {loading ? "Updating..." : "Update Game"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
