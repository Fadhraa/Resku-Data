import { NextRequest, NextResponse } from 'next/server';

const BASE_API_URL_1 = 'https://emsifa.github.io/api-wilayah-indonesia/api';
const BASE_API_URL_2 = 'https://www.emsifa.com/api-wilayah-indonesia/api';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const id = searchParams.get('id') || '';

  let pathsToTry: string[] = [];
  if (type === 'provinces') {
    pathsToTry = ['provinces.json'];
  } else if (type === 'regencies' && id) {
    pathsToTry = [`regencies/${id}.json`];
  } else if (type === 'districts' && id) {
    pathsToTry = [`districts/${id}.json`];
    if (id.length === 4) pathsToTry.push(`districts/${id}0.json`);
  } else if (type === 'villages' && id) {
    pathsToTry = [`villages/${id}.json`];
    if (id.length === 6) pathsToTry.push(`villages/${id}0.json`);
  } else {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }

  for (const path of pathsToTry) {
    for (const baseUrl of [BASE_API_URL_1, BASE_API_URL_2]) {
      try {
        const res = await fetch(`${baseUrl}/${path}`, {
          next: { revalidate: 86400 },
        });
        if (res.ok) {
          const data = await res.json();
          return NextResponse.json(data, {
            headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=86400' },
          });
        }
      } catch (e) {
        // Continue fallback loop
      }
    }
  }

  // Return empty list instead of 502 so client fallback kicks in cleanly
  return NextResponse.json([]);
}
