// /app/api/checkout/route.js
import { NextResponse } from 'next/server';

// Importar MercadoPago v2
import { MercadoPagoConfig, Preference } from 'mercadopago';

const client = new MercadoPagoConfig({ 
  accessToken: process.env.MP_ACCESS_TOKEN,
  options: { timeout: 5000 }
});

export async function POST(req) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt requerido' }, { status: 400 });
    }

    const preference = new Preference(client);

    const preferenceData = {
      items: [{
        id: '1',
        title: 'Canción personalizada con IA',
        quantity: 1,
        currency_id: 'MXN',
        unit_price: 50
      }],
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_BASE_URL}/?status=approved`,
        failure: `${process.env.NEXT_PUBLIC_BASE_URL}/?status=rejected`,
        pending: `${process.env.NEXT_PUBLIC_BASE_URL}/?status=pending`
      },
      notification_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhook`,
      metadata: { 
        prompt: prompt
      },
      auto_return: 'approved'
    };

    const response = await preference.create({ body: preferenceData });
    
    return NextResponse.json({ 
      init_point: response.init_point,
      preference_id: response.id 
    });

  } catch (error) {
    console.error('Error creando preferencia:', error);
    return NextResponse.json({ 
      error: 'Error creando preferencia de pago' 
    }, { status: 500 });
  }
}