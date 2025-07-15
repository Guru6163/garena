import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/lib/generated/prisma';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const { name, phone } = await req.json();
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { phone: phone || undefined },
        { name },
      ],
    },
  });
  if (!user) {
    user = await prisma.user.create({
      data: { name, phone },
    });
  }
  return NextResponse.json(user);
}

export async function GET() {
  const users = await prisma.user.findMany({ orderBy: { created_at: 'desc' } });
  return NextResponse.json(users);
}

// DELETE user by id (expects ?id=)
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'User ID required' }, { status: 400 });
  await prisma.user.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}

// PATCH user to deactivate (expects ?id=)
export async function PATCH(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'User ID required' }, { status: 400 });
  const user = await prisma.user.update({ where: { id: Number(id) }, data: { is_active: false } });
  return NextResponse.json(user);
} 