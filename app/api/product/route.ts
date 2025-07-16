import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  // List all products
  const products = await prisma.product.findMany({ where: { is_active: true } })
  return NextResponse.json(products)
}

export async function POST(req: NextRequest) {
  // Create a new product
  const { name, price } = await req.json()
  if (!name || typeof price !== 'number') {
    return NextResponse.json({ error: 'Name and price are required' }, { status: 400 })
  }
  const product = await prisma.product.create({ data: { name, price } })
  return NextResponse.json(product)
}

export async function PUT(req: NextRequest) {
  // Update a product
  const { id, name, price, is_active } = await req.json()
  if (!id) {
    return NextResponse.json({ error: 'Product id is required' }, { status: 400 })
  }
  const product = await prisma.product.update({
    where: { id },
    data: { name, price, is_active },
  })
  return NextResponse.json(product)
}

export async function DELETE(req: NextRequest) {
  // Soft delete a product
  const { id } = await req.json()
  if (!id) {
    return NextResponse.json({ error: 'Product id is required' }, { status: 400 })
  }
  const product = await prisma.product.update({
    where: { id },
    data: { is_active: false },
  })
  return NextResponse.json(product)
} 