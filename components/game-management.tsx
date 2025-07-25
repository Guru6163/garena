"use client"

import { useState, useEffect } from "react"
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

type GameManagementProps = {
  games: any[]
  onDataChange: () => void
}

export function GameManagement({ games, onDataChange }: GameManagementProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingGame, setEditingGame] = useState<any | null>(null) // Changed from Game to any
  const [formData, setFormData] = useState({
    title: "",
    prices: [{ name: "", price: "" }],
  })
  const [loading, setLoading] = useState(false)

  // Add game via API
  const handleAddGame = async () => {
    if (!formData.title || formData.prices.length === 0) return
    setLoading(true)
    try {
      await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: formData.title.trim(), prices: formData.prices.map(p => ({ name: p.name.trim(), price: Number(p.price) })) })
      })
      setFormData({ title: '', prices: [{ name: '', price: '' }] })
      setIsAddDialogOpen(false)
      onDataChange()
    } finally {
      setLoading(false)
    }
  }

  // Edit game via API
  const handleEditGame = async () => {
    if (!editingGame || !formData.title || formData.prices.length === 0) return
    setLoading(true)
    try {
      await fetch('/api/game', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingGame.id, title: formData.title, prices: formData.prices.map(p => ({ name: p.name.trim(), price: Number(p.price) })) })
      })
      setEditingGame(null)
      setFormData({ title: '', prices: [{ name: '', price: '' }] })
      onDataChange()
    } finally {
      setLoading(false)
    }
  }

  // Delete game via API
  const handleDeleteGame = async (gameId: number) => {
    setLoading(true)
    try {
      await fetch('/api/game', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: gameId })
      })
      onDataChange()
    } finally {
      setLoading(false)
    }
  }

  // Commented out DB/API code for LS-only mode
  // const handleDeleteGame = async (gameId: number) => {
  //   if (storageMode === "ls") {
  //     const newGames = localGames.filter(g => g.id !== gameId)
  //     saveGamesLS(newGames)
  //     toast.success('Game deleted successfully!')
  //     return
  //   }
  //   try {
  //     setLoading(true)
  //     const res = await fetch(`/api/game?id=${gameId}`, { method: 'DELETE' })
  //     if (!res.ok) {
  //       const data = await res.json()
  //       if (data.error && data.error.includes('sessions exist')) {
  //         toast.error('Cannot delete game: sessions exist for this game.')
  //         return
  //       }
  //       throw new Error('Failed to delete game')
  //     }
  //     toast.success('Game deleted successfully!')
  //     onDataChange()
  //   } catch (error) {
  //     toast.error('Error deleting game')
  //     console.error('Error deleting game:', error)
  //   } finally {
  //     setLoading(false)
  //   }
  // }

  // Commented out DB/API code for LS-only mode
  // const toggleGameStatus = async (gameId: number, currentStatus: boolean) => {
  //   if (storageMode === "ls") {
  //     const newGames = localGames.map(g => g.id === gameId ? { ...g, is_active: !currentStatus } : g)
  //     saveGamesLS(newGames)
  //     toast.success('Game status updated!')
  //     return
  //   }
  //   try {
  //     setLoading(true)
  //     const res = await fetch(`/api/game/${gameId}/status`, {
  //       method: 'PUT',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ is_active: !currentStatus }),
  //     })
  //     if (!res.ok) throw new Error('Failed to update game status')
  //     toast.success('Game status updated!')
  //     onDataChange()
  //   } catch (error) {
  //     toast.error('Error updating game status')
  //     console.error("Error updating game status:", error)
  //   } finally {
  //     setLoading(false)
  //   }
  // }

  const startEdit = (game: any) => { // Changed from Game to any
    setEditingGame(game)
    setFormData({
      title: game.title,
      prices: game.prices.map((p: any) => ({ name: p.name, price: p.price })),
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
                <Label htmlFor="title">Game Title</Label>
                <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Enter game title" className="w-full" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="prices">Pricing Models</Label>
                <div className="grid gap-2">
                  {formData.prices.map((price, index) => (
                    <div key={index} className="grid grid-cols-2 gap-2 items-center">
                      <Input
                        id={`price-name-${index}`}
                        value={price.name}
                        onChange={(e) => {
                          const newPrices = [...formData.prices];
                          newPrices[index] = { ...newPrices[index], name: e.target.value };
                          setFormData({ ...formData, prices: newPrices });
                        }}
                        placeholder="Model Name"
                      />
                      <div className="flex gap-2">
                        <Input
                          id={`price-price-${index}`}
                          type="number"
                          value={price.price}
                          onChange={(e) => {
                            const newPrices = [...formData.prices];
                            newPrices[index] = { ...newPrices[index], price: e.target.value };
                            setFormData({ ...formData, prices: newPrices });
                          }}
                          placeholder="Price (₹)"
                        />
                        {formData.prices.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:bg-red-100 p-0 ml-2"
                            aria-label="Remove pricing model"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                prices: formData.prices.filter((_, i) => i !== index),
                              });
                            }}
                          >
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setFormData({ ...formData, prices: [...formData.prices, { name: "", price: "" }] })}
                  className="mt-2"
                >
                  Add Pricing Model
                </Button>
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
                  <CardTitle className="text-lg">{game.title}</CardTitle>
                  <CardDescription>
                    <table className="w-full text-sm text-left text-gray-600 mt-2">
                      <thead>
                        <tr>
                          <th className="pr-4 pb-1 font-semibold">Model Name</th>
                          <th className="pb-1 font-semibold">Price (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {game.prices.map((p: any, i: number) => (
                          <tr key={i}>
                            <td className="pr-4 py-1">{p.name}</td>
                            <td className="py-1 font-medium">₹{p.price}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
              <Label htmlFor="edit-title">Game Title</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-prices">Pricing Models</Label>
              <div className="grid gap-2">
                {formData.prices.map((price, index) => (
                  <div key={index} className="grid grid-cols-2 gap-2 items-center">
                    <Input
                      id={`edit-price-name-${index}`}
                      value={price.name}
                      onChange={(e) => {
                        const newPrices = [...formData.prices];
                        newPrices[index] = { ...newPrices[index], name: e.target.value };
                        setFormData({ ...formData, prices: newPrices });
                      }}
                      placeholder="Model Name"
                    />
                    <div className="flex gap-2">
                      <Input
                        id={`edit-price-price-${index}`}
                        type="number"
                        value={price.price}
                        onChange={(e) => {
                          const newPrices = [...formData.prices];
                          newPrices[index] = { ...newPrices[index], price: e.target.value };
                          setFormData({ ...formData, prices: newPrices });
                        }}
                        placeholder="Price (₹)"
                      />
                      {formData.prices.length > 1 && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              prices: formData.prices.filter((_, i) => i !== index),
                            });
                          }}
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                onClick={() => setFormData({ ...formData, prices: [...formData.prices, { name: "", price: "" }] })}
                className="mt-2"
              >
                Add Pricing Model
              </Button>
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
