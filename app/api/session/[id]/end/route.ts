import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: NextRequest) {
  // Extract session ID from the URL
  const url = new URL(req.url);
  const parts = url.pathname.split('/');
  const sessionId = Number(parts[parts.length - 2]); // [id] is the second to last segment

  if (!sessionId) return NextResponse.json({ error: 'Session ID required' }, { status: 400 });

  // Parse extras from body (optional)
  let extras = [];
  try {
    const body = await req.json();
    extras = Array.isArray(body.extras) ? body.extras : [];
  } catch (e) {
    // No body or invalid JSON, ignore
  }

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

  // Handle extras (products)
  let extrasTotal = 0;
  let extrasDetails = [];
  for (const extra of extras) {
    if (!extra.productId || !extra.quantity || extra.quantity <= 0) continue;
    const product = await prisma.product.findUnique({ where: { id: extra.productId } });
    if (!product) continue;
    const total_price = product.price * extra.quantity;
    extrasTotal += total_price;
    extrasDetails.push({ name: product.name, price: product.price, quantity: extra.quantity, total: total_price });
    await prisma.sessionProduct.create({
      data: {
        session_id: sessionId,
        product_id: product.id,
        quantity: extra.quantity,
        total_price,
      },
    });
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
    extras: extrasDetails,
    extrasTotal,
    total: price + extrasTotal,
  };

  const updated = await prisma.session.update({
    where: { id: sessionId },
    data: {
      end_time: end,
      is_active: false,
      bill_amount: price + extrasTotal,
      bill_details: JSON.stringify(billDetails),
    },
  });
  return NextResponse.json(updated);
} 