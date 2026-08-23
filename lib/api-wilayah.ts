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
  { id: '531901', regency_id: '5319', name: 'BORONG' },
  { id: '531902', regency_id: '5319', name: 'KOTA KOMBA' },
  { id: '531903', regency_id: '5319', name: 'ELAR' },
  { id: '531904', regency_id: '5319', name: 'SAMBI RAMPAS' },
  { id: '531905', regency_id: '5319', name: 'RANA MESE' },
  { id: '531906', regency_id: '5319', name: 'LAMBA LEDA' },
  { id: '531907', regency_id: '5319', name: 'ELAR SELATAN' },
  { id: '531908', regency_id: '5319', name: 'KOTA KOMBA UTARA' },
  { id: '531909', regency_id: '5319', name: 'LAMBA LEDA SELATAN' },
  { id: '531910', regency_id: '5319', name: 'LAMBA LEDA TIMUR' },
  { id: '531911', regency_id: '5319', name: 'CONGKAR' },
  { id: '531912', regency_id: '5319', name: 'LAMBA LEDA UTARA' },
];

export const FALLBACK_VILLAGES_BORONG: Village[] = [
  { id: '5319011001', district_id: '531901', name: 'RANA LOBA' },
  { id: '5319011002', district_id: '531901', name: 'MOTANG RUA' },
  { id: '5319011003', district_id: '531901', name: 'NANA BAWA' },
  { id: '5319012004', district_id: '531901', name: 'POCO RANAKA' },
  { id: '5319012005', district_id: '531901', name: 'GURUNG LIWUT' },
  { id: '5319012006', district_id: '531901', name: 'NTAUR' },
  { id: '5319012007', district_id: '531901', name: 'COMPANG NDOE' },
];

async function fetchWithFallback<T>(internalApiUrl: string, directCdnUrl: string): Promise<T | null> {
  // 1. Try Internal Next.js API Proxy
  try {
    const res = await fetch(internalApiUrl);
    if (res.ok) {
      return (await res.json()) as T;
    }
  } catch (e) {
    // Internal API call failed or offline
  }

  // 2. Try Direct CDN URL
  try {
    const res = await fetch(directCdnUrl);
    if (res.ok) {
      return (await res.json()) as T;
    }
  } catch (e) {
    // Direct CDN also failed
  }

  return null;
}

export async function fetchProvinces(): Promise<Province[]> {
  if (cache.provinces) return cache.provinces;
  const data = await fetchWithFallback<Province[]>(
    '/api/wilayah?type=provinces',
    `${DIRECT_CDN_URL}/provinces.json`
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
    `${DIRECT_CDN_URL}/regencies/${provinceId}.json`
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
    `${DIRECT_CDN_URL}/districts/${regencyId}.json`
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
  const data = await fetchWithFallback<Village[]>(
    `/api/wilayah?type=villages&id=${districtId}`,
    `${DIRECT_CDN_URL}/villages/${districtId}.json`
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
