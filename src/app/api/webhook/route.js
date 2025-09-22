// /app/api/webhook/route.js 
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();
    console.log('Webhook recibido:', body);

    const { type, data } = body;

    if (type === 'payment') {
      // Verificar el pago con MercadoPago
      const response = await fetch(
        `https://api.mercadopago.com/v1/payments/${data.id}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
          },
        }
      );

      if (!response.ok) {
        console.error('Error verificando pago:', response.status);
        return NextResponse.json({ status: 'error' }, { status: 400 });
      }

      const paymentData = await response.json();
      console.log('Datos del pago:', paymentData);

      if (paymentData.status === 'approved') {
        const prompt = paymentData.metadata?.prompt;
        const payment_id = data.id;

        if (prompt) {
          // Llamar a la API de generación
          const generateResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/generate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              prompt,
              payment_id 
            }),
          });

          if (!generateResponse.ok) {
            console.error('Error generando música:', await generateResponse.text());
          } else {
            console.log('Generación iniciada para payment_id:', payment_id);
          }
        }
      }
    }

    return NextResponse.json({ status: 'ok' });

  } catch (error) {
    console.error('Error en webhook:', error);
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}