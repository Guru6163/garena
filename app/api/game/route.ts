import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const { name, rate, rate_type } = await req.json();
  if (!name || !rate || !rate_type) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  let game = await prisma.game.findUnique({ where: { name } });
  if (!game) {
    game = await prisma.game.create({ data: { name, rate, rate_type } });
  }
  return NextResponse.json(game);
}

export async function GET() {
  const games = await prisma.game.findMany({ orderBy: { created_at: 'desc' } });
  return NextResponse.json(games);
}

// PATCH game (edit)
export async function PATCH(req: NextRequest) {
  const { id, name, rate, rate_type } = await req.json();
  if (!id || !name || !rate || !rate_type) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  const game = await prisma.game.update({ where: { id: Number(id) }, data: { name, rate, rate_type } });
  return NextResponse.json(game);
}

// DELETE game by id (expects ?id=)
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Game ID required' }, { status: 400 });
  // Check for sessions referencing this game
  const sessionCount = await prisma.session.count({ where: { game_id: Number(id) } });
  if (sessionCount > 0) {
    return NextResponse.json({ error: 'Cannot delete game: sessions exist for this game.' }, { status: 400 });
  }
  await prisma.game.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
} 