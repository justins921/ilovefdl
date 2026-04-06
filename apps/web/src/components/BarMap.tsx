'use client';

import { useEffect, useRef } from 'react';
import type { Bar } from '@ilovefdl/shared';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface BarMapProps {
  bars: Bar[];
  className?: string;
}

// Default center: Fond du Lac, WI
const DEFAULT_CENTER: [number, number] = [43.775, -88.4467];
const DEFAULT_ZOOM = 13;

export default function BarMap({ bars, className = '' }: BarMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    const barsWithCoords = bars.filter(
      (b) => b.latitude != null && b.longitude != null
    );

    // Custom marker icon
    const icon = L.divIcon({
      className: 'bar-marker',
      html: `<div style="
        width: 32px; height: 32px;
        background: #E86833;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex; align-items: center; justify-content: center;
      ">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 11h1a3 3 0 0 1 0 6h-1"/><path d="M9 12v6"/><path d="M13 12v6"/><path d="M14 7.5c-1 0-1.44.5-3 .5s-2-.5-3-.5-1.72.5-2.5.5a2.5 2.5 0 0 1 0-5c.78 0 1.57.5 2.5.5S9.44 2 11 2s2 1 3 1 1.72-.5 2.5-.5a2.5 2.5 0 0 1 0 5c-.78 0-1.5-.5-2.5-.5Z"/><line x1="12" x2="12" y1="18" y2="22"/>
        </svg>
      </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });

    for (const bar of barsWithCoords) {
      const marker = L.marker([bar.latitude!, bar.longitude!], { icon }).addTo(map);

      const photo = bar.photos?.[0];
      const photoHtml = photo
        ? `<img src="${photo}" alt="${bar.name}" style="width:100%;height:80px;object-fit:cover;border-radius:4px;margin-bottom:6px;" />`
        : '';

      marker.bindPopup(`
        <div style="min-width:180px;font-family:system-ui,sans-serif;">
          ${photoHtml}
          <strong style="font-size:14px;">${bar.name}</strong>
          <p style="margin:4px 0 0;font-size:12px;color:#666;">${bar.address}</p>
          <a href="/bars/${bar.slug}" style="display:inline-block;margin-top:6px;font-size:12px;color:#2BBCB3;text-decoration:none;font-weight:500;">View Details &rarr;</a>
        </div>
      `);
    }

    // Fit bounds if we have markers
    if (barsWithCoords.length > 0) {
      const group = L.featureGroup(
        barsWithCoords.map((b) => L.marker([b.latitude!, b.longitude!]))
      );
      map.fitBounds(group.getBounds().pad(0.1));
    }
  }, [bars]);

  return (
    <div
      ref={mapRef}
      className={`rounded-xl border border-light overflow-hidden ${className}`}
      style={{ minHeight: 400 }}
    />
  );
}
