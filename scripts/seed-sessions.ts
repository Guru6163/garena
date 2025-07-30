import { prisma } from '../lib/prisma'

function randomDateInLastMonth() {
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * 30);
  const hours = Math.floor(Math.random() * 12) + 1; // 1-12 hours session
  const start = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  start.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), 0, 0);
  const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
  return { start, end };
}

function randomBillDetails() {
  const total = Math.floor(Math.random() * 2000) + 500;
  return JSON.stringify({ total, extras: Math.random() > 0.5 ? [{ name: 'Water', price: 50 }] : [] });
}

async function main() {
  const users = await prisma.user.findMany();
  const games = await prisma.game.findMany({
    include: { prices: true }
  });
  if (users.length === 0 || games.length === 0) {
    throw new Error('Seed users and games first!');
  }

  const sessions = [];
  for (let i = 0; i < 100; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const game = games[Math.floor(Math.random() * games.length)];
    const { start, end } = randomDateInLastMonth();
    const bill_details = randomBillDetails();
    sessions.push({
      user_id: user.id,
      game_id: game.id,
      start_time: start,
      end_time: end,
      is_active: false,
      created_at: start,
      game_name: game.title,
      game_rate: game.prices[0]?.price || 1000,
      game_rate_type: game.prices[0]?.name || 'hour',
      bill_amount: JSON.parse(bill_details).total,
      bill_details,
    });
  }
  await prisma.session.createMany({ data: sessions });
  console.log('Seeded 100 sessions!');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(() => prisma.$disconnect()); 