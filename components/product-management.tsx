import { useEffect, useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'

interface ProductManagementProps {
  storageMode: string
}

export function ProductManagement({ storageMode }: ProductManagementProps) {
  const [products, setProducts] = useState<any[]>([])
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [editing, setEditing] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [localProducts, setLocalProducts] = useState<any[]>([])

  // Commented out DB/API code for LS-only mode
  // const loadProducts = async () => {
  //   setLoading(true)
  //   const res = await fetch('/api/product')
  //   const data = await res.json()
  //   setProducts(data)
  //   setLoading(false)
  // }

  useEffect(() => {
    if (storageMode === "ls") {
      const stored = localStorage.getItem("products")
      if (stored) {
        setLocalProducts(JSON.parse(stored))
      } else {
        setLocalProducts([])
      }
    }
  }, [storageMode])

  useEffect(() => {
    if (storageMode === "ls") {
      const handler = (e: StorageEvent) => {
        if (e.key === "products") {
          setLocalProducts(e.newValue ? JSON.parse(e.newValue) : [])
        }
      }
      window.addEventListener("storage", handler)
      return () => window.removeEventListener("storage", handler)
    }
  }, [storageMode])

  const saveProductsLS = (newProducts: any[]) => {
    localStorage.setItem("products", JSON.stringify(newProducts))
    setLocalProducts(newProducts)
  }

  const displayProducts = storageMode === "ls" ? localProducts : products

  const handleAdd = async () => {
    if (!name || !price) return
    if (storageMode === "ls") {
      const newProduct = { id: Date.now(), name, price: Number(price) }
      const newProducts = [...(localProducts || []), newProduct]
      saveProductsLS(newProducts)
      setName('')
      setPrice('')
      return
    }
    setLoading(true)
    // await fetch('/api/product', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ name, price: Number(price) })
    // })
    setName('')
    setPrice('')
    // loadProducts()
  }

  const handleEdit = (product: any) => {
    setEditing(product)
    setName(product.name)
    setPrice(product.price.toString())
  }

  const handleUpdate = async () => {
    if (!editing) return
    if (storageMode === "ls") {
      const newProducts = localProducts.map(p => p.id === editing.id ? { ...p, name, price: Number(price) } : p)
      saveProductsLS(newProducts)
      setEditing(null)
      setName('')
      setPrice('')
      return
    }
    setLoading(true)
    // await fetch('/api/product', {
    //   method: 'PUT',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ id: editing.id, name, price: Number(price) })
    // })
    setEditing(null)
    setName('')
    setPrice('')
    // loadProducts()
  }

  const handleDelete = async (id: number) => {
    if (storageMode === "ls") {
      const newProducts = localProducts.filter(p => p.id !== id)
      saveProductsLS(newProducts)
      return
    }
    setLoading(true)
    // await fetch('/api/product', {
    //   method: 'DELETE',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ id })
    // })
    // loadProducts()
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Manage Extras (Products)</h2>
      <div className="flex gap-2 mb-4">
        <Input placeholder="Product name" value={name} onChange={e => setName(e.target.value)} />
        <Input placeholder="Price" type="number" value={price} onChange={e => setPrice(e.target.value)} />
        {editing ? (
          <Button onClick={handleUpdate} disabled={loading}>Update</Button>
        ) : (
          <Button onClick={handleAdd} disabled={loading}>Add</Button>
        )}
        {editing && <Button variant="outline" onClick={() => { setEditing(null); setName(''); setPrice('') }}>Cancel</Button>}
      </div>
      <table className="min-w-full bg-white border">
        <thead>
          <tr>
            <th className="px-4 py-2 border">Name</th>
            <th className="px-4 py-2 border">Price</th>
            <th className="px-4 py-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {displayProducts.map(product => (
            <tr key={product.id}>
              <td className="px-4 py-2 border">{product.name}</td>
              <td className="px-4 py-2 border">₹{product.price}</td>
              <td className="px-4 py-2 border">
                <Button size="sm" variant="outline" onClick={() => handleEdit(product)}>Edit</Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(product.id)} className="ml-2">Delete</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
} 