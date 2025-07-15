import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/lib/generated/prisma';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const { user, game, start_time } = await req.json();
  if (!user || !game) return NextResponse.json({ error: 'User and Game required' }, { status: 400 });

  // Check or create user
  let dbUser = await prisma.user.findFirst({
    where: {
      OR: [
        { phone: user.phone || undefined },
        { email: user.email || undefined },
        { name: user.name },
      ],
    },
  });
  if (!dbUser) {
    dbUser = await prisma.user.create({ data: user });
  }

  // Check or create game
  let dbGame = await prisma.game.findUnique({ where: { name: game.name } });
  if (!dbGame) {
    dbGame = await prisma.game.create({ data: game });
  }

  // Start session
  const session = await prisma.session.create({
    data: {
      user_id: dbUser.id,
      game_id: dbGame.id,
      start_time: start_time ? new Date(start_time) : new Date(),
      game_name: dbGame.name,
      game_rate: dbGame.rate,
      game_rate_type: dbGame.rate_type,
    },
    include: { user: true, game: true },
  });
  return NextResponse.json(session);
} 