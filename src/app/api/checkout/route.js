// /app/api/checkout/route.js
import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';

const client = new MercadoPagoConfig({ 
  accessToken: process.env.MP_ACCESS_TOKEN,
  options: { timeout: 5000 }
});

export async function POST(req) {
  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt requerido' }, { status: 400 });
    }

    const preference = new Preference(client);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    if (!baseUrl) {
      throw new Error('NEXT_PUBLIC_BASE_URL no está definido en el entorno');
    }

    const preferenceData = {
      items: [
        {
          id: '1',
          title: 'Canción personalizada con IA',
          quantity: 1,
          currency_id: 'MXN',
          unit_price: 50
        }
      ],
      back_urls: {
        success: `${baseUrl}/?status=approved`,
        failure: `${baseUrl}/?status=rejected`,
        pending: `${baseUrl}/?status=pending`
      },
      auto_return: 'approved',
      notification_url: `${baseUrl}/api/webhook`,
      metadata: {
        prompt
      }
    };

    const response = await preference.create({ body: preferenceData });

    return NextResponse.json({
      init_point: response.init_point,
      preference_id: response.id
    });

  } catch (error) {
    console.error('Error creando preferencia de pago:', error);
    return NextResponse.json({
      error: 'Error creando preferencia de pago',
      details: error.message || error
    }, { status: 500 });
  }
}
