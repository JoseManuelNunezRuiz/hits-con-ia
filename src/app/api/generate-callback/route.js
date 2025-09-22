// /app/api/generate-callback/route.js
import { NextResponse } from 'next/server';

// Store para las canciones generadas (en producción usar base de datos)
let generatedSongs = new Map();

export async function POST(req) {
  try {
    console.log('Callback recibido');
    const body = await req.json();
    console.log('Callback body:', JSON.stringify(body, null, 2));

    const { code, msg, data } = body;

    if (code === 200 && data?.callbackType === 'complete') {
      const payment_id = data.metadata?.payment_id;
      
      if (data.data && data.data.length > 0) {
        const songData = data.data[0]; // Primera canción generada
        
        const newSong = {
          id: data.task_id,
          payment_id: payment_id,
          title: songData.title || 'Canción generada',
          audioUrl: songData.url,
          prompt: data.prompt || 'Canción generada',
          duration: songData.duration || '3:24',
          createdAt: new Date().toISOString(),
          isPaid: true
        };

        // Guardar la canción vinculada al payment_id
        if (payment_id) {
          generatedSongs.set(payment_id, newSong);
        }
        
        console.log('Canción guardada:', newSong);
        return NextResponse.json({ status: 'received' });
      }
    }

    console.log('Callback no procesado:', { code, msg });
    return NextResponse.json({ status: 'error', msg: msg || 'Datos incompletos' }, { status: 400 });

  } catch (error) {
    console.error('Error en callback:', error);
    return NextResponse.json({ status: 'error', msg: 'Error interno' }, { status: 500 });
  }
}

// Función para obtener una canción específica por payment_id
export function getSongByPaymentId(payment_id) {
  return generatedSongs.get(payment_id) || null;
}

// Función para obtener todas las canciones
export function getAllGeneratedSongs() {
  return Array.from(generatedSongs.values()).reverse();
}
