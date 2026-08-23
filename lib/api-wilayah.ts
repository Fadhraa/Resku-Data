import { District, Province, Regency, Village } from '@/types/resku';

const DIRECT_CDN_URL = 'https://emsifa.github.io/api-wilayah-indonesia/api';

// In-memory cache
const cache: {
  provinces?: Province[];
  regencies: Record<string, Regency[]>;
  districts: Record<string, District[]>;
  villages: Record<string, Village[]>;
} = {
  regencies: {},
  districts: {},
  villages: {},
};

// Fallback static data for Kabupaten Manggarai Timur (Code 5319) in NTT (Code 53)
export const NTT_PROVINCE: Province = { id: '53', name: 'NUSA TENGGARA TIMUR' };
export const MATIM_REGENCY: Regency = { id: '5319', province_id: '53', name: 'KABUPATEN MANGGARAI TIMUR' };

export const FALLBACK_DISTRICTS_MATIM: District[] = [
  { id: '5319010', regency_id: '5319', name: 'BORONG' },
  { id: '5319020', regency_id: '5319', name: 'KOTA KOMBA' },
  { id: '5319030', regency_id: '5319', name: 'ELAR' },
  { id: '5319040', regency_id: '5319', name: 'SAMBI RAMPAS' },
  { id: '5319050', regency_id: '5319', name: 'RANA MESE' },
  { id: '5319060', regency_id: '5319', name: 'LAMBA LEDA' },
  { id: '5319070', regency_id: '5319', name: 'ELAR SELATAN' },
  { id: '5319080', regency_id: '5319', name: 'KOTA KOMBA UTARA' },
  { id: '5319090', regency_id: '5319', name: 'LAMBA LEDA SELATAN' },
  { id: '5319100', regency_id: '5319', name: 'LAMBA LEDA TIMUR' },
  { id: '5319110', regency_id: '5319', name: 'CONGKAR' },
  { id: '5319120', regency_id: '5319', name: 'LAMBA LEDA UTARA' },
];

export const FALLBACK_VILLAGES_BORONG: Village[] = [
  { id: '5319010005', district_id: '5319010', name: 'RANA LOBA' },
  { id: '5319010003', district_id: '5319010', name: 'NANGA LABANG' },
  { id: '5319010004', district_id: '5319010', name: 'GOLO KANTAR' },
  { id: '5319010006', district_id: '5319010', name: 'KOTA NDORA' },
  { id: '5319010007', district_id: '5319010', name: 'RANA MASAK' },
  { id: '5319010013', district_id: '5319010', name: 'GURUNG LIWUT' },
  { id: '5319010027', district_id: '5319010', name: 'SATAR PEOT' },
];

async function fetchWithFallback<T>(internalApiUrl: string, directCdnUrls: string[]): Promise<T | null> {
  // 1. Try Internal Next.js API Proxy
  try {
    const res = await fetch(internalApiUrl);
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json) && json.length > 0) return json as T;
    }
  } catch (e) {
    // Ignore internal API failure
  }

  // 2. Try Direct CDN URLs
  for (const cdnUrl of directCdnUrls) {
    try {
      const res = await fetch(cdnUrl);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json) && json.length > 0) return json as T;
      }
    } catch (e) {
      // Ignore CDN failure
    }
  }

  return null;
}

export async function fetchProvinces(): Promise<Province[]> {
  if (cache.provinces) return cache.provinces;
  const data = await fetchWithFallback<Province[]>(
    '/api/wilayah?type=provinces',
    [`${DIRECT_CDN_URL}/provinces.json`]
  );
  if (data && Array.isArray(data)) {
    cache.provinces = data;
    return data;
  }
  return [NTT_PROVINCE];
}

export async function fetchRegencies(provinceId: string): Promise<Regency[]> {
  if (cache.regencies[provinceId]) return cache.regencies[provinceId];
  const data = await fetchWithFallback<Regency[]>(
    `/api/wilayah?type=regencies&id=${provinceId}`,
    [`${DIRECT_CDN_URL}/regencies/${provinceId}.json`]
  );
  if (data && Array.isArray(data)) {
    cache.regencies[provinceId] = data;
    return data;
  }
  if (provinceId === '53') return [MATIM_REGENCY];
  return [];
}

export async function fetchDistricts(regencyId: string): Promise<District[]> {
  if (cache.districts[regencyId]) return cache.districts[regencyId];
  const data = await fetchWithFallback<District[]>(
    `/api/wilayah?type=districts&id=${regencyId}`,
    [`${DIRECT_CDN_URL}/districts/${regencyId}.json`]
  );
  if (data && Array.isArray(data)) {
    cache.districts[regencyId] = data;
    return data;
  }
  if (regencyId === '5319') return FALLBACK_DISTRICTS_MATIM;
  return [];
}

export async function fetchVillages(districtId: string): Promise<Village[]> {
  if (cache.villages[districtId]) return cache.villages[districtId];
  
  const cdnPaths = [`${DIRECT_CDN_URL}/villages/${districtId}.json`];
  if (!districtId.endsWith('0')) {
    cdnPaths.push(`${DIRECT_CDN_URL}/villages/${districtId}0.json`);
  }

  const data = await fetchWithFallback<Village[]>(
    `/api/wilayah?type=villages&id=${districtId}`,
    cdnPaths
  );
  if (data && Array.isArray(data)) {
    cache.villages[districtId] = data;
    return data;
  }
  if (districtId.startsWith('531901')) return FALLBACK_VILLAGES_BORONG;
  return [
    { id: `${districtId}01`, district_id: districtId, name: 'DESA / KELURAHAN PUSAT' },
    { id: `${districtId}02`, district_id: districtId, name: 'DESA TANGGAP BENCANA 1' },
    { id: `${districtId}03`, district_id: districtId, name: 'DESA TANGGAP BENCANA 2' },
  ];
}
