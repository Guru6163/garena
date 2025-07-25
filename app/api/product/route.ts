import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const products = await prisma.product.findMany();
    return NextResponse.json(products);
  } catch (error) {
    console.error('Product GET error:', error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}

function serializeBigInts(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(serializeBigInts);
  } else if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      const value = obj[key];
      result[key] = typeof value === 'bigint' ? value.toString() : serializeBigInts(value);
    }
    return result;
  }
  return obj;
}

export async function POST(req: NextRequest) {
  try {
    const { name, price } = await req.json();
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    let product = await prisma.product.findFirst({
      where: { name },
    });
    if (!product) {
      product = await prisma.product.create({
        data: { name, price },
      });
    }
    return NextResponse.json(product);
  } catch (error) {
    console.error('Product POST error:', error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
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