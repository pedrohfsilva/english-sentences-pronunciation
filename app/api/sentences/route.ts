import { NextResponse } from 'next/server';
import sentences from '@/data/sentences.json';

export async function GET() {
  return NextResponse.json(sentences);
}
