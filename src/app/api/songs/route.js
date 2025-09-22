import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabaseClient';

export async function GET() {
  try {
    const { data: songs, error } = await supabase
      .from('songs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error obteniendo canciones:', error);
      return NextResponse.json({ songs: [], count: 0, error: 'Error interno del servidor' }, { status: 500 });
    }

    return NextResponse.json({ songs, count: songs.length });

  } catch (error) {
    console.error('Error obteniendo canciones:', error);
    return NextResponse.json({ songs: [], count: 0, error: 'Error interno del servidor' }, { status: 500 });
  }
}
