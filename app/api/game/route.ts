import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Create a new game with multiple pricing models
export async function POST(req: NextRequest) {
  const { title, prices } = await req.json();
  if (!title || !Array.isArray(prices) || prices.length === 0) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  const game = await prisma.game.create({
    data: {
      title,
      prices: {
        create: prices.map((p: any) => ({ name: p.name, price: p.price }))
      }
    },
    include: { prices: true }
  });
  return NextResponse.json(game);
}

// Get all games with their pricing models
export async function GET() {
  try {
    const games = await prisma.game.findMany({
      orderBy: { created_at: 'desc' },
      include: { prices: true }
    });
    return NextResponse.json(games);
  } catch (error) {
    console.error('Error fetching games:', error);
    return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 });
  }
}

// Update a game and its pricing models
export async function PATCH(req: NextRequest) {
  const { id, title, prices } = await req.json();
  if (!id || !title || !Array.isArray(prices) || prices.length === 0) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  // Update game title
  const updatedGame = await prisma.game.update({
    where: { id: Number(id) },
    data: { title },
  });
  // Remove old prices and add new ones
  await prisma.gamePrice.deleteMany({ where: { gameId: Number(id) } });
  await prisma.gamePrice.createMany({
    data: prices.map((p: any) => ({ name: p.name, price: p.price, gameId: Number(id) }))
  });
  const gameWithPrices = await prisma.game.findUnique({
    where: { id: Number(id) },
    include: { prices: true }
  });
  return NextResponse.json(gameWithPrices);
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
  await prisma.gamePrice.deleteMany({ where: { gameId: Number(id) } });
  await prisma.game.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
} 