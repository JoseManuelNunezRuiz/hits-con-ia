import { NextResponse } from 'next/server';
import { getSongByPaymentId } from '../generate-callback/route.js';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const payment_id = searchParams.get('payment_id');

    if (!payment_id) {
      return NextResponse.json({ error: 'Falta el payment_id' }, { status: 400 });
    }

    const song = getSongByPaymentId(payment_id);

    if (!song) {
      // No existe canción generada todavía
      return NextResponse.json({ ready: false, message: 'Canción no encontrada' }, { status: 404 });
    }

    if (!song.audioUrl) {
      // La canción aún no tiene URL de audio (proceso no completado)
      return NextResponse.json({ ready: false, message: 'Generación en progreso' }, { status: 202 });
    }

    return NextResponse.json({
      ready: true,
      url: song.audioUrl,
      title: song.title,
      prompt: song.prompt,
      duration: song.duration
    });

  } catch (error) {
    console.error('Error verificando status:', error);
    return NextResponse.json({ ready: false, error: 'Error interno' }, { status: 500 });
  }
}
