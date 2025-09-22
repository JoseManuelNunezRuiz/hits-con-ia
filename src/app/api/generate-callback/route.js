import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabaseClient';

export async function POST(req) {
  try {
    console.log('📩 Callback recibido');
    const body = await req.json();
    console.log('🔍 Callback body:', JSON.stringify(body, null, 2));

    const { code, msg, data } = body;

    if (code === 200 && data?.callbackType === 'complete') {
      const payment_id = data.metadata?.payment_id;

      if (!payment_id) {
        console.error('❌ payment_id faltante en metadata');
        return NextResponse.json({ status: 'error', msg: 'payment_id faltante' }, { status: 400 });
      }

      const songData = data?.data?.[0];

      if (!songData || !(songData.audio_url || songData.url)) {
        console.error('❌ Datos de canción inválidos');
        return NextResponse.json({ status: 'error', msg: 'Canción inválida' }, { status: 400 });
      }

      // Elegir la URL del audio, según cuál venga
      const audioUrl = songData.audio_url || songData.url;

      // Obtener prompt del metadata o fallback
      const prompt = data.metadata?.prompt || data.prompt || 'Canción generada';

      // Guardar en Supabase
      const { error } = await supabase.from('songs').insert({
        payment_id,
        title: songData.title || 'Canción generada',
        audio_url: audioUrl,
        prompt,
        duration: songData.duration?.toString() || '204', // guardo en segundos o como string
        is_paid: true,
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error('❌ Error guardando en Supabase:', error);
        return NextResponse.json({ status: 'error', msg: 'Error de base de datos' }, { status: 500 });
      }

      console.log('✅ Canción guardada exitosamente con payment_id:', payment_id);
      return NextResponse.json({ status: 'received' });
    }

    console.warn('⚠️ Callback no procesado correctamente:', { code, msg });
    return NextResponse.json({ status: 'error', msg: msg || 'Datos incompletos' }, { status: 400 });

  } catch (error) {
    console.error('🔥 Error interno en callback:', error);
    return NextResponse.json({ status: 'error', msg: 'Error interno del servidor' }, { status: 500 });
  }
}
