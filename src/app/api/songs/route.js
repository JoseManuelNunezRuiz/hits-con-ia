// /app/api/songs/route.js 
import { NextResponse } from 'next/server';
import { getAllGeneratedSongs } from '../generate-callback/route.js';

export async function GET() {
  try {
    const songs = getAllGeneratedSongs();
    return NextResponse.json(songs);
  } catch (error) {
    console.error('Error obteniendo canciones:', error);
    return NextResponse.json([], { status: 200 });
  }
}