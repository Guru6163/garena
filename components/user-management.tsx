"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Trash2, Edit, Plus, Phone, Mail } from "lucide-react"
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
// import { saveAs } from "file-saver"

interface UserManagementProps {
  users: any[] // Changed from User[] to any[] as supabase is removed
  onDataChange: () => void
}

export function UserManagement({ users, onDataChange }: UserManagementProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any | null>(null) // Changed from User to any
  const [formData, setFormData] = useState({ name: "", phone: "" })
  const [loading, setLoading] = useState(false)

  const handleAddUser = async () => {
    if (!formData.name) return

    try {
      setLoading(true)
      const res = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name, phone: formData.phone || undefined }),
      })
      if (!res.ok) throw new Error('Failed to add user')
      toast.success('User added successfully!')
      setFormData({ name: '', phone: '' })
      setIsAddDialogOpen(false)
      onDataChange()
    } catch (error) {
      toast.error('Error adding user')
      console.error('Error adding user:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEditUser = async () => {
    if (!editingUser || !formData.name) return

    try {
      setLoading(true)
      const res = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name, phone: formData.phone || undefined }),
      })
      if (!res.ok) throw new Error('Failed to update user')
      toast.success('User updated successfully!')
      setEditingUser(null)
      setFormData({ name: '', phone: '' })
      onDataChange()
    } catch (error) {
      toast.error('Error updating user')
      console.error('Error updating user:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (userId: number) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/user?id=${userId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete user')
      toast.success('User deleted successfully!')
      onDataChange()
    } catch (error) {
      toast.error('Error deleting user')
      console.error('Error deleting user:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeactivateUser = async (userId: number) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/user?id=${userId}`, { method: 'PATCH' })
      if (!res.ok) throw new Error('Failed to deactivate user')
      toast.success('User deactivated!')
      onDataChange()
    } catch (error) {
      toast.error('Error deactivating user')
      console.error('Error deactivating user:', error)
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (user: any) => { // Changed from User to any
    setEditingUser(user)
    setFormData({
      name: user.name,
      phone: user.phone || "",
    })
  }

  // vCard export handler
  const handleExportVCF = () => {
    if (!users || users.length === 0) return
    let vcf = ""
    users.forEach((user) => {
      vcf += "BEGIN:VCARD\n"
      vcf += "VERSION:3.0\n"
      vcf += `FN:${user.name ? user.name + ' turf' : 'Unknown turf'}\n`
      if (user.phone) vcf += `TEL;TYPE=CELL:${user.phone}\n`
      if (user.email) vcf += `EMAIL:${user.email}\n`
      vcf += "END:VCARD\n"
    })
    // Create a blob and trigger download
    const blob = new Blob([vcf], { type: "text/vcard;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "users.vcf"
    document.body.appendChild(a)
    a.click()
    setTimeout(() => {
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 0)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">User Management</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportVCF}>
            Export Users to vCard
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>Create a new user account</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter full name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddUser} disabled={loading}>
                  {loading ? "Adding..." : "Add User"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* User Table */}
      <div className="overflow-x-auto w-full px-0">
        <Table className="w-full min-w-full">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} className={!user.is_active ? "opacity-60" : ""}>
                <TableCell className="min-w-full">{user.name}</TableCell>
                <TableCell className="min-w-full">{user.phone || <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell className="min-w-full">{user.email || <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell className="min-w-full">
                  <Badge variant={user.is_active ? "default" : "secondary"}>
                    {user.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="min-w-full">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => startEdit(user)} disabled={loading}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => handleDeleteUser(user.id)} disabled={loading} variant="destructive" size="sm">Delete</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Full Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-phone">Phone Number</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleEditUser} disabled={loading}>
              {loading ? "Updating..." : "Update User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
