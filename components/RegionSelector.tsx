"use client";

import React, { useState, useEffect } from "react";
import {
  District,
  Province,
  Regency,
  RegionSelection,
  Village,
} from "@/types/resku";
import {
  fetchDistricts,
  fetchProvinces,
  fetchRegencies,
  fetchVillages,
  MATIM_REGENCY,
  NTT_PROVINCE,
} from "@/lib/api-wilayah";

interface Props {
  value: RegionSelection;
  onChange: (value: RegionSelection) => void;
}

export default function RegionSelector({ value, onChange }: Props) {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [regencies, setRegencies] = useState<Regency[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);

  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingVillages, setLoadingVillages] = useState(false);

  // Load provinces and regencies on mount
  useEffect(() => {
    async function init() {
      const provs = await fetchProvinces();
      setProvinces(provs);
      const regs = await fetchRegencies(value.provinceCode || "53");
      setRegencies(regs);
      const dists = await fetchDistricts(value.regencyCode || "5319");
      setDistricts(dists);
      if (value.districtCode) {
        const vills = await fetchVillages(value.districtCode);
        setVillages(vills);
      }
    }
    init();
  }, []);

  // Handle Province change
  const handleProvinceChange = async (provId: string) => {
    const provObj = provinces.find((p) => p.id === provId) || NTT_PROVINCE;
    setRegencies([]);
    setDistricts([]);
    setVillages([]);

    const regs = await fetchRegencies(provId);
    setRegencies(regs);
    const defaultReg = regs[0] || MATIM_REGENCY;

    const dists = await fetchDistricts(defaultReg.id);
    setDistricts(dists);
    const defaultDist = dists[0];

    let vills: Village[] = [];
    if (defaultDist) {
      vills = await fetchVillages(defaultDist.id);
      setVillages(vills);
    }

    onChange({
      ...value,
      provinceCode: provObj.id,
      provinceName: provObj.name,
      regencyCode: defaultReg.id,
      regencyName: defaultReg.name,
      districtCode: defaultDist ? defaultDist.id : "",
      districtName: defaultDist ? defaultDist.name : "",
      villageCode: vills[0] ? vills[0].id : "",
      villageName: vills[0] ? vills[0].name : "",
    });
  };

  // Handle Regency change
  const handleRegencyChange = async (regId: string) => {
    const regObj = regencies.find((r) => r.id === regId);
    setDistricts([]);
    setVillages([]);
    setLoadingDistricts(true);

    const dists = await fetchDistricts(regId);
    setDistricts(dists);
    setLoadingDistricts(false);
    const defaultDist = dists[0];

    let vills: Village[] = [];
    if (defaultDist) {
      setLoadingVillages(true);
      vills = await fetchVillages(defaultDist.id);
      setVillages(vills);
      setLoadingVillages(false);
    }

    onChange({
      ...value,
      regencyCode: regId,
      regencyName: regObj ? regObj.name : "",
      districtCode: defaultDist ? defaultDist.id : "",
      districtName: defaultDist ? defaultDist.name : "",
      villageCode: vills[0] ? vills[0].id : "",
      villageName: vills[0] ? vills[0].name : "",
    });
  };

  // Handle District change
  const handleDistrictChange = async (distId: string) => {
    const distObj = districts.find((d) => d.id === distId);
    setVillages([]);
    setLoadingVillages(true);

    const vills = await fetchVillages(distId);
    setVillages(vills);
    setLoadingVillages(false);
    const defaultVill = vills[0];

    onChange({
      ...value,
      districtCode: distId,
      districtName: distObj ? distObj.name : "",
      villageCode: defaultVill ? defaultVill.id : "",
      villageName: defaultVill ? defaultVill.name : "",
    });
  };

  // Handle Village change
  const handleVillageChange = (villId: string) => {
    const villObj = villages.find((v) => v.id === villId);
    onChange({
      ...value,
      villageCode: villId,
      villageName: villObj ? villObj.name : "",
    });
  };

  // Quick preset button for Matim
  const handleResetToMatim = async () => {
    const provs = await fetchProvinces();
    const regs = await fetchRegencies("53");
    const dists = await fetchDistricts("5319");
    const vills = await fetchVillages("531901"); // Borong

    setProvinces(provs);
    setRegencies(regs);
    setDistricts(dists);
    setVillages(vills);

    onChange({
      provinceCode: "53",
      provinceName: "NUSA TENGGARA TIMUR",
      regencyCode: "5319",
      regencyName: "KABUPATEN MANGGARAI TIMUR",
      districtCode: "531901",
      districtName: "BORONG",
      villageCode: "5319011001",
      villageName: "RANA LOBA",
      isManual: false,
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5 space-y-4">
      {/* Header Context Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-sm sm:text-base text-slate-800 font-display">
            Wilayah Pendataan Lapangan
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Manual Input Toggle */}
          <button
            type="button"
            onClick={() => onChange({ ...value, isManual: !value.isManual })}
            className={`text-[11px] font-bold px-2.5 py-1 rounded-md border transition-colors ${
              value.isManual
                ? "bg-amber-100 text-amber-900 border-amber-300"
                : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
            }`}
          >
            {value.isManual ? "Mode: Manual" : "Mode: Dropdown "}
          </button>
        </div>
      </div>

      {/* Manual Input Mode */}
      {value.isManual ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-slide-up">
          <div>
            <label className="form-label text-xs">
              Nama Kecamatan (Manual)
            </label>
            <input
              type="text"
              value={value.manualDistrict || ""}
              onChange={(e) =>
                onChange({ ...value, manualDistrict: e.target.value })
              }
              className="form-input text-xs"
              placeholder="Contoh: Borong / Kota Komba"
              required
            />
          </div>
          <div>
            <label className="form-label text-xs">
              Nama Desa / Kelurahan (Manual)
            </label>
            <input
              type="text"
              value={value.manualVillage || ""}
              onChange={(e) =>
                onChange({ ...value, manualVillage: e.target.value })
              }
              className="form-input text-xs"
              placeholder="Contoh: Rana Loba / Waelengga"
              required
            />
          </div>
        </div>
      ) : (
        /* API Dropdown Mode */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Provinsi */}
          <div>
            <label className="form-label text-xs">Provinsi</label>
            <select
              value={value.provinceCode}
              onChange={(e) => handleProvinceChange(e.target.value)}
              className="form-select text-xs font-medium"
            >
              {provinces.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Kabupaten / Kota */}
          <div>
            <label className="form-label text-xs">Kabupaten / Kota</label>
            <select
              value={value.regencyCode}
              onChange={(e) => handleRegencyChange(e.target.value)}
              className="form-select text-xs font-medium"
            >
              {regencies.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Kecamatan */}
          <div>
            <label className="form-label text-xs flex items-center justify-between">
              <span>Kecamatan</span>
              {loadingDistricts && (
                <span className="text-[10px] text-blue-600 animate-pulse">
                  Memuat...
                </span>
              )}
            </label>
            <select
              value={value.districtCode}
              onChange={(e) => handleDistrictChange(e.target.value)}
              className="form-select text-xs font-semibold bg-blue-50/50 border-blue-200"
              disabled={loadingDistricts}
            >
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Desa / Kelurahan */}
          <div>
            <label className="form-label text-xs flex items-center justify-between">
              <span>Desa / Kelurahan</span>
              {loadingVillages && (
                <span className="text-[10px] text-blue-600 animate-pulse">
                  Memuat...
                </span>
              )}
            </label>
            <select
              value={value.villageCode}
              onChange={(e) => handleVillageChange(e.target.value)}
              className="form-select text-xs font-semibold bg-blue-50/50 border-blue-200"
              disabled={loadingVillages}
            >
              {villages.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Selected Location Summary pill */}
      <div className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 text-xs flex items-center gap-2">
        <span className="font-semibold text-slate-500 shrink-0">
          Lokasi Terpilih:
        </span>
        <span className="font-bold text-blue-900 truncate">
          {value.isManual
            ? `${value.manualDistrict || "[Kecamatan]"}, ${value.manualVillage || "[Desa]"}`
            : `Kec. ${value.districtName || "-"}, Desa ${value.villageName || "-"} (${value.regencyName})`}
        </span>
      </div>
    </div>
  );
}
