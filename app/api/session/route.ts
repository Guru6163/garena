import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const { user_id, game_id, price_name, price_value, start_time, switch_pricing_at_6pm, price_name_after_6pm, price_value_after_6pm } = await req.json();
  if (!user_id || !game_id || !price_name || !price_value) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  // Start session
  const session = await prisma.session.create({
    data: {
      user_id: Number(user_id),
      game_id: Number(game_id),
      start_time: start_time ? new Date(start_time) : new Date(),
      game_name: (await prisma.game.findUnique({ where: { id: Number(game_id) } }))?.title,
      game_rate: price_value,
      game_rate_type: price_name,
      switch_pricing_at_6pm: !!switch_pricing_at_6pm,
      // Store after 6PM pricing if provided
      game_rate_after_6pm: price_value_after_6pm ?? null,
      game_rate_type_after_6pm: price_name_after_6pm ?? null,
    },
    include: { user: true, game: true },
  });
  return NextResponse.json(session);
}

export async function GET() {
  const sessions = await prisma.session.findMany({
    include: {
      user: true,
      game: true,
    },
    orderBy: { start_time: 'desc' },
  });
  return NextResponse.json(sessions);
} 