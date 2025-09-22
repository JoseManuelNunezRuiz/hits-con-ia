// /app/api/generate/route.js 
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { prompt, payment_id } = await req.json();

    if (!prompt || prompt.length === 0) {
      return NextResponse.json({ error: 'Prompt es requerido' }, { status: 400 });
    }

    const apiKey = process.env.SUNO_API_KEY;
    if (!apiKey) {
      console.error('No se encontró SUNO_API_KEY');
      return NextResponse.json({ error: 'Configuración de API key faltante' }, { status: 500 });
    }

    // Usar la URL del callback correcto
    const callbackUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/generate-callback`;

    const body = {
      customMode: false,
      instrumental: false,
      model: 'V3_5',
      prompt,
      callBackUrl: callbackUrl,
      // Agregar payment_id como metadata para poder vincularlo después
      metadata: { payment_id }
    };

    console.log('Generando con prompt:', prompt);
    console.log('Callback URL:', callbackUrl);

    const response = await fetch('https://api.suno.ai/api/v1/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Error response from Suno:', text);
      
      let errorMsg = 'Error en la API de Suno';
      try {
        const errorData = JSON.parse(text);
        errorMsg = errorData.msg || errorMsg;
      } catch {
        errorMsg = text;
      }

      return NextResponse.json({ error: errorMsg }, { status: response.status });
    }

    const data = await response.json();
    console.log('Respuesta de Suno:', data);
    
    return NextResponse.json({ 
      task_id: data.data?.task_id || data.task_id || null,
      success: true 
    });

  } catch (error) {
    console.error('Error en generate:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
