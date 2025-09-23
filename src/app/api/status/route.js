import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabaseClient';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const payment_id = searchParams.get('payment_id');

    console.log('🔍 Consultando status para payment_id:', payment_id);

    if (!payment_id) {
      return NextResponse.json(
        { error: 'Falta el payment_id' }, 
        { status: 400 }
      );
    }

    // Consultar Supabase
    const { data: song, error } = await supabase
      .from('songs')
      .select('*')
      .eq('payment_id', payment_id)
      .maybeSingle(); // Usar maybeSingle en lugar de single

    if (error) {
      console.error('❌ Error en Supabase:', error);
      return NextResponse.json(
        { error: 'Error de base de datos' }, 
        { status: 500 }
      );
    }

    console.log('📊 Resultado de la consulta:', song);

    if (!song) {
      return NextResponse.json({ 
        ready: false, 
        message: 'Canción no encontrada' 
      });
    }

    if (!song.audio_url) {
      return NextResponse.json({ 
        ready: false, 
        message: 'Generación en progreso' 
      });
    }

    return NextResponse.json({
      ready: true,
      url: song.audio_url,
      title: song.title,
      prompt: song.prompt,
      duration: song.duration,
    });

  } catch (error) {
    console.error('🔥 Error en /api/status:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' }, 
      { status: 500 }
    );
  }
}