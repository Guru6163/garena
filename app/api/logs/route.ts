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
    // Use bill_details.total if available
    let price = 0;
    let billDetails = {};
    if (s.bill_details) {
      try {
        billDetails = typeof s.bill_details === 'string' ? JSON.parse(s.bill_details) : s.bill_details;
        if (typeof billDetails.total === 'number') {
          price = billDetails.total;
        }
      } catch {}
    }
    // Fallback to old logic if no bill_details
    if (!price) {
      if (s.game_rate_type === 'hour') {
        price = Math.round((durationSec / 3600) * (s.game_rate || 0));
      } else {
        price = Math.round((durationSec / 1800) * (s.game_rate || 0));
      }
    }
    // Only return clean fields
    return {
      id: s.id,
      user_id: s.user_id,
      game_id: s.game_id,
      start_time: s.start_time,
      end_time: s.end_time,
      is_active: s.is_active,
      game_name: s.game_name,
      bill_amount: s.bill_amount,
      bill_details: billDetails,
      users: s.user,
      games: s.game,
      durationSec,
      price,
    };
  });

  return NextResponse.json(logs);
} 