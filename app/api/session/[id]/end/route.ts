import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: NextRequest) {
  console.log('End session API called');
  try {
    // Extract session ID from the URL
    const url = new URL(req.url);
    const parts = url.pathname.split('/');
    const sessionId = Number(parts[parts.length - 2]); // [id] is the second to last segment

    if (!sessionId) return NextResponse.json({ error: 'Session ID required' }, { status: 400 });

    // Parse extras from body (optional)
    let extras = [];
    let providedEndTime = null;
    try {
      const body = await req.json();
      extras = Array.isArray(body.extras) ? body.extras : [];
      if (body.end_time) providedEndTime = new Date(body.end_time);
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
    const end = providedEndTime || new Date();
    const durationSec = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
    let price = 0;

    // Enhanced pricing logic for switch_pricing_at_6pm
    let breakdown: any[] = [];
    if (session.switch_pricing_at_6pm && (session.game_rate_after_6pm || session.game_rate_type_after_6pm)) {
      // Find 6PM on the session's start date
      const switchTime = new Date(start);
      switchTime.setHours(18, 0, 0, 0); // 6:00 PM
      let beforeSec = 0, afterSec = 0;
      // Only split if start < 6PM and end > 6PM (not equal)
      if (end <= switchTime || start >= switchTime) {
        // No overlap, use single rate
        if (end <= switchTime) {
          beforeSec = durationSec;
          // Use before 6PM rate
          const beforeRate = session.game_rate || 0;
          price = Math.round((beforeSec / 3600) * beforeRate);
        } else {
          afterSec = durationSec;
          const afterRate = session.game_rate_after_6pm || 0;
          price = Math.round((afterSec / 3600) * afterRate);
        }
      } else {
        // Overlaps 6PM: start < 6PM, end > 6PM
        beforeSec = Math.floor((switchTime.getTime() - start.getTime()) / 1000);
        afterSec = Math.floor((end.getTime() - switchTime.getTime()) / 1000);
        const beforeRate = session.game_rate || 0;
        const afterRate = session.game_rate_after_6pm || 0;
        const beforeAmount = Math.round((beforeSec / 3600) * beforeRate);
        const afterAmount = Math.round((afterSec / 3600) * afterRate);
        price = beforeAmount + afterAmount;
        // Add breakdown if session spans 6PM
        breakdown = [
          {
            label: `Before 6PM`,
            from: start,
            to: switchTime,
            durationSec: beforeSec,
            rate: beforeRate,
            rateType: session.game_rate_type,
            amount: beforeAmount,
          },
          {
            label: `After 6PM`,
            from: switchTime,
            to: end,
            durationSec: afterSec,
            rate: afterRate,
            rateType: session.game_rate_type_after_6pm,
            amount: afterAmount,
          },
        ];
      }
    } else {
      // Assume price is per hour by default
      price = Math.round((durationSec / 3600) * (session.game_rate || 0));
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

    // Ensure price and extrasTotal are numbers
    price = typeof price === 'number' && !isNaN(price) ? price : 0;
    extrasTotal = typeof extrasTotal === 'number' && !isNaN(extrasTotal) ? extrasTotal : 0;

    // Use session.game_rate_type as a label only
    const billDetails = {
      user: session.user.name,
      game: session.game_name,
      start_time: session.start_time,
      end_time: end,
      durationSec,
      rate: session.game_rate,
      rate_type: session.game_rate_type,
      price,
      breakdown, // add breakdown to bill details
      extras: extrasDetails,
      extrasTotal,
      total: price + extrasTotal, // always a number
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
    console.log('End session API success');
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('End session error:', error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}

export const POST = PUT; 