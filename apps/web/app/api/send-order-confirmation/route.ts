import { NextRequest, NextResponse } from 'next/server';
import { sendOrderConfirmation } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      orderId,
      customerName,
      customerEmail,
      customerPhone,
      deliveryAddress,
      mapsUrl,
      items,
      totalPrice,
      totalSavings,
      totalOriginalPrice,
      loyaltyCode,
      loyaltyPercent,
      totalWeight,
    } = body;

    // Validate required fields
    if (!orderId || !customerName || !customerEmail || !customerPhone || !deliveryAddress || !items || !totalPrice) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Send email
    const result = await sendOrderConfirmation({
      orderId,
      customerName,
      customerEmail,
      customerPhone,
      deliveryAddress,
      mapsUrl,
      items,
      totalPrice,
      totalSavings,
      totalOriginalPrice,
      loyaltyCode,
      loyaltyPercent,
      totalWeight,
    });

    return NextResponse.json({
      success: true,
      message: 'Order confirmation email sent successfully',
      messageId: result.messageId,
    });
  } catch (error) {
    console.error('Error in send-order-confirmation API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send order confirmation email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
