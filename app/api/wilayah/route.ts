import { NextRequest, NextResponse } from 'next/server';

const BASE_API_URL_1 = 'https://emsifa.github.io/api-wilayah-indonesia/api';
const BASE_API_URL_2 = 'https://www.emsifa.com/api-wilayah-indonesia/api';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const id = searchParams.get('id');

  let path = '';
  if (type === 'provinces') {
    path = 'provinces.json';
  } else if (type === 'regencies' && id) {
    path = `regencies/${id}.json`;
  } else if (type === 'districts' && id) {
    path = `districts/${id}.json`;
  } else if (type === 'villages' && id) {
    path = `villages/${id}.json`;
  } else {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }

  // Try Primary, fallback to Secondary CDN if primary fails
  try {
    const res = await fetch(`${BASE_API_URL_1}/${path}`, {
      next: { revalidate: 86400 },
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data, {
        headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=86400' },
      });
    }
  } catch (e) {
    console.warn('Primary API Wilayah fetch failed, trying secondary CDN...');
  }

  try {
    const res = await fetch(`${BASE_API_URL_2}/${path}`, {
      next: { revalidate: 86400 },
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data, {
        headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=86400' },
      });
    }
  } catch (e) {
    console.error('Secondary API Wilayah fetch also failed:', e);
  }

  return NextResponse.json({ error: 'Failed to fetch regional data' }, { status: 502 });
}
