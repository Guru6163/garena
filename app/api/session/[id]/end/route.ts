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

    // Calculate billing information
    const start = new Date(session.start_time);
    const end = providedEndTime || new Date();
    const durationSec = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
    
    // Initialize billing variables
    let gameAmount = 0;
    let hasDualPricing = false;
    let pricingOverlaps6pm = false;
    let durationBefore6pm = 0;
    let durationAfter6pm = 0;
    let amountBefore6pm = 0;
    let amountAfter6pm = 0;
    let breakdown: any[] = [];

    // Check if session has dual pricing enabled
    if (session.switch_pricing_at_6pm && session.game_rate_after_6pm && session.game_rate_type_after_6pm) {
      hasDualPricing = true;
      
      // Find 6PM on the session's start date
      const switchTime = new Date(start);
      switchTime.setHours(18, 0, 0, 0); // 6:00 PM
      
      // Check if session overlaps 6PM
      if (start < switchTime && end > switchTime) {
        pricingOverlaps6pm = true;
        
        // Calculate durations
        durationBefore6pm = Math.floor((switchTime.getTime() - start.getTime()) / 1000);
        durationAfter6pm = Math.floor((end.getTime() - switchTime.getTime()) / 1000);
        
        // Calculate amounts for each period
        const beforeRate = session.game_rate || 0;
        const afterRate = session.game_rate_after_6pm || 0;
        
        if (session.game_rate_type?.toLowerCase().includes('hour')) {
          amountBefore6pm = Math.round((durationBefore6pm / 3600) * beforeRate);
        } else if (session.game_rate_type?.toLowerCase().includes('30min')) {
          amountBefore6pm = Math.round((durationBefore6pm / 1800) * beforeRate);
        } else {
          amountBefore6pm = Math.round((durationBefore6pm / 3600) * beforeRate);
        }
        
        if (session.game_rate_type_after_6pm?.toLowerCase().includes('hour')) {
          amountAfter6pm = Math.round((durationAfter6pm / 3600) * afterRate);
        } else if (session.game_rate_type_after_6pm?.toLowerCase().includes('30min')) {
          amountAfter6pm = Math.round((durationAfter6pm / 1800) * afterRate);
        } else {
          amountAfter6pm = Math.round((durationAfter6pm / 3600) * afterRate);
        }
        
        gameAmount = amountBefore6pm + amountAfter6pm;
        
        // Create breakdown
        breakdown = [
          {
            label: 'Before 6PM',
            from: start,
            to: switchTime,
            durationSec: durationBefore6pm,
            rate: beforeRate,
            rateType: session.game_rate_type || 'hour',
            amount: amountBefore6pm,
          },
          {
            label: 'After 6PM',
            from: switchTime,
            to: end,
            durationSec: durationAfter6pm,
            rate: afterRate,
            rateType: session.game_rate_type_after_6pm || 'hour',
            amount: amountAfter6pm,
          },
        ];
      } else {
        // No overlap - use single rate
        if (end <= switchTime) {
          // All time before 6PM
          durationBefore6pm = durationSec;
          const beforeRate = session.game_rate || 0;
          
          if (session.game_rate_type?.toLowerCase().includes('hour')) {
            amountBefore6pm = Math.round((durationBefore6pm / 3600) * beforeRate);
          } else if (session.game_rate_type?.toLowerCase().includes('30min')) {
            amountBefore6pm = Math.round((durationBefore6pm / 1800) * beforeRate);
          } else {
            amountBefore6pm = Math.round((durationBefore6pm / 3600) * beforeRate);
          }
          
          gameAmount = amountBefore6pm;
        } else {
          // All time after 6PM
          durationAfter6pm = durationSec;
          const afterRate = session.game_rate_after_6pm || 0;
          
          if (session.game_rate_type_after_6pm?.toLowerCase().includes('hour')) {
            amountAfter6pm = Math.round((durationAfter6pm / 3600) * afterRate);
          } else if (session.game_rate_type_after_6pm?.toLowerCase().includes('30min')) {
            amountAfter6pm = Math.round((durationAfter6pm / 1800) * afterRate);
          } else {
            amountAfter6pm = Math.round((durationAfter6pm / 3600) * afterRate);
          }
          
          gameAmount = amountAfter6pm;
        }
        
        breakdown = [
          {
            label: end <= switchTime ? 'Before 6PM' : 'After 6PM',
            from: start,
            to: end,
            durationSec: durationSec,
            rate: end <= switchTime ? (session.game_rate || 0) : (session.game_rate_after_6pm || 0),
            rateType: end <= switchTime ? (session.game_rate_type || 'hour') : (session.game_rate_type_after_6pm || 'hour'),
            amount: gameAmount,
          },
        ];
      }
    } else {
      // Single pricing model
      const rate = session.game_rate || 0;
      const rateType = session.game_rate_type || 'hour';
      
      if (rateType.toLowerCase().includes('hour')) {
        gameAmount = Math.round((durationSec / 3600) * rate);
      } else if (rateType.toLowerCase().includes('30min')) {
        gameAmount = Math.round((durationSec / 1800) * rate);
      } else {
        gameAmount = Math.round((durationSec / 3600) * rate);
      }
      
      breakdown = [
        {
          label: 'Game Session',
          from: start,
          to: end,
          durationSec: durationSec,
          rate: rate,
          rateType: rateType,
          amount: gameAmount,
        },
      ];
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

    // Calculate total amount
    const totalAmount = gameAmount + extrasTotal;

    // Create detailed bill information
    const billDetails = {
      user: session.user.name,
      game: session.game_name || session.game.title,
      start_time: session.start_time,
      end_time: end,
      durationSec,
      gameAmount,
      breakdown,
      extras: extrasDetails,
      extrasTotal,
      total: totalAmount,
      hasDualPricing,
      pricingOverlaps6pm,
    };

    // Update session with all billing information
    const updated = await prisma.session.update({
      where: { id: sessionId },
      data: {
        end_time: end,
        is_active: false,
        bill_amount: totalAmount,
        bill_details: JSON.stringify(billDetails),
        has_dual_pricing: hasDualPricing,
        pricing_overlaps_6pm: pricingOverlaps6pm,
        duration_before_6pm_seconds: durationBefore6pm,
        duration_after_6pm_seconds: durationAfter6pm,
        amount_before_6pm: amountBefore6pm,
        amount_after_6pm: amountAfter6pm,
        extras_amount: extrasTotal,
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