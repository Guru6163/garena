import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/lib/generated/prisma';

const prisma = new PrismaClient();

export async function PUT(req: NextRequest) {
  // Extract session ID from the URL
  const url = new URL(req.url);
  const parts = url.pathname.split('/');
  const sessionId = Number(parts[parts.length - 2]); // [id] is the second to last segment

  if (!sessionId) return NextResponse.json({ error: 'Session ID required' }, { status: 400 });

  // Fetch session with game info
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { game: true, user: true },
  });
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  // Calculate bill amount
  const start = new Date(session.start_time);
  const end = new Date();
  const durationSec = Math.floor((end.getTime() - start.getTime()) / 1000);
  let price = 0;
  if (session.game.rate_type === 'hour') {
    price = Math.round((durationSec / 3600) * session.game.rate);
  } else {
    price = Math.round((durationSec / 1800) * session.game.rate);
  }
  // Use session.game_name, session.game_rate, session.game_rate_type for billDetails
  const billDetails = {
    user: session.user.name,
    game: session.game_name,
    start_time: session.start_time,
    end_time: end,
    durationSec,
    rate: session.game_rate,
    rate_type: session.game_rate_type,
    price,
  };

  const updated = await prisma.session.update({
    where: { id: sessionId },
    data: {
      end_time: end,
      is_active: false,
      bill_amount: price,
      bill_details: JSON.stringify(billDetails),
    },
  });
  return NextResponse.json(updated);
} 