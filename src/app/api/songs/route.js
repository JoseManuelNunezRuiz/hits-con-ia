import { NextResponse } from 'next/server';
import { getAllGeneratedSongs } from '../generate-callback/route.js';

export async function GET() {
  try {
    const songs = getAllGeneratedSongs();
    return NextResponse.json({ songs, count: songs.length });
  } catch (error) {
    console.error('Error obteniendo canciones:', error);
    return NextResponse.json({ songs: [], count: 0, error: 'Error interno del servidor' }, { status: 500 });
  }
}
