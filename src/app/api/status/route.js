import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabaseClient';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const payment_id = searchParams.get('payment_id');

    if (!payment_id) {
      return NextResponse.json({ error: 'Falta el payment_id' }, { status: 400 });
    }

    const { data: songs, error } = await supabase
      .from('songs')
      .select('*')
      .eq('payment_id', payment_id)
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {  // Código para no encontrado
      console.error('Error consultando Supabase:', error);
      return NextResponse.json({ error: 'Error de base de datos' }, { status: 500 });
    }

    if (!songs) {
      return NextResponse.json({ ready: false, message: 'Canción no encontrada' }, { status: 404 });
    }

    if (!songs.audio_url) {
      return NextResponse.json({ ready: false, message: 'Generación en progreso' }, { status: 202 });
    }

    return NextResponse.json({
      ready: true,
      url: songs.audio_url,
      title: songs.title,
      prompt: songs.prompt,
      duration: songs.duration,
    });

  } catch (error) {
    console.error('Error verificando status:', error);
    return NextResponse.json({ ready: false, error: 'Error interno' }, { status: 500 });
  }
}
