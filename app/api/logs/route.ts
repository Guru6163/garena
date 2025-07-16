import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const gameId = searchParams.get('gameId');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const where: any = {};
  if (gameId) where.game_id = Number(gameId);
  if (from || to) where.start_time = {};
  if (from) where.start_time.gte = new Date(from);
  if (to) where.start_time.lte = new Date(to);

  const sessions = await prisma.session.findMany({
    where,
    include: { user: true, game: true },
    orderBy: { start_time: 'desc' },
  });

  // Add duration in seconds and price calculation
  const logs = sessions.map((s) => {
    const end = s.end_time ? new Date(s.end_time) : new Date();
    const start = new Date(s.start_time);
    const durationSec = Math.floor((end.getTime() - start.getTime()) / 1000);
    let price = 0;
    if (s.game.rate_type === 'hour') {
      price = Math.round((durationSec / 3600) * s.game.rate);
    } else {
      price = Math.round((durationSec / 1800) * s.game.rate);
    }
    // Rename fields to match frontend expectations
    return { ...s, games: s.game, users: s.user, durationSec, price };
  });

  return NextResponse.json(logs);
} 