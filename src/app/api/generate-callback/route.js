import { NextResponse } from 'next/server';

// En memoria para desarrollo; usar DB en producción
let generatedSongs = new Map();
let taskPaymentMap = new Map();

export async function POST(req) {
  try {
    console.log('Callback recibido');
    const body = await req.json();
    console.log('Callback body:', JSON.stringify(body, null, 2));

    const { code, msg, data } = body;

    if (code === 200 && data?.callbackType === 'complete') {
      // Obtener payment_id usando task_id recibido en callback
      const payment_id = taskPaymentMap.get(data.task_id);

      if (data.data && data.data.length > 0) {
        const songData = data.data[0]; // Tomar la primera canción generada

        const newSong = {
          id: data.task_id,
          payment_id,
          title: songData.title || 'Canción generada',
          audioUrl: songData.audio_url,
          prompt: songData.prompt || 'Canción generada',
          duration: songData.duration || 204, // segundos
          createdAt: new Date().toISOString(),
          isPaid: true
        };

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

// Función para crear el mapa task_id -> payment_id
export function linkTaskToPayment(task_id, payment_id) {
  taskPaymentMap.set(task_id, payment_id);
}

// Obtener canción por payment_id
export function getSongByPaymentId(payment_id) {
  return generatedSongs.get(payment_id) || null;
}

// Obtener todas las canciones
export function getAllGeneratedSongs() {
  return Array.from(generatedSongs.values()).reverse();
}
