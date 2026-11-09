import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

// Partner Boulangeries across Paris zones (including 15ème / Pasteur / Rue du Dr Roux)
const PARTNER_BOULANGERIES = [
  { id: 'partner-12', shop_name: 'Boulangerie-Pâtisserie Pasteur', shop_address: '25 Boulevard Pasteur, 75015 Paris', lat: 48.8448, lng: 2.3125 },
  { id: 'partner-13', shop_name: 'Le Moulin de la Vierge Volontaires', shop_address: '105 Rue Vercingétorix / Rue Lecourbe, 75015 Paris', lat: 48.8458, lng: 2.3068 },
  { id: 'partner-14', shop_name: 'Maison Pichard Cambronne', shop_address: '88 Rue Cambronne, 75015 Paris', lat: 48.8439, lng: 2.3032 },
  { id: 'partner-11', shop_name: 'Boulangerie Thierry Marx', shop_address: '51 Rue de Vaugirard, 75015 Paris', lat: 48.8442, lng: 2.3185 },
  { id: 'partner-10', shop_name: 'Maison Kayser Montparnasse', shop_address: '14 Rue du Départ, 75015 Paris', lat: 48.8428, lng: 2.3235 },
  { id: 'partner-1', shop_name: 'Boulangerie Poilâne du Marais', shop_address: '38 Rue de Bretagne, 75003 Paris', lat: 48.8615, lng: 2.3622 },
  { id: 'partner-2', shop_name: 'Maison Landemaine Saint-Paul', shop_address: '26 Rue des Rosiers, 75004 Paris', lat: 48.8568, lng: 2.3585 },
  { id: 'partner-3', shop_name: 'Du Pain et des Idées', shop_address: '34 Rue Yves Toudic, 75010 Paris', lat: 48.8710, lng: 2.3628 },
  { id: 'partner-4', shop_name: 'Boulangerie Utopie', shop_address: '20 Rue Jean-Pierre Timbaud, 75011 Paris', lat: 48.8648, lng: 2.3682 },
  { id: 'partner-5', shop_name: 'La Maison d’Isabelle', shop_address: '47ter Bd Saint-Germain, 75005 Paris', lat: 48.8502, lng: 2.3482 },
  { id: 'partner-8', shop_name: 'Boulangerie Moderne Rabineau', shop_address: '16 Rue des Fossés Saint-Jacques, 75005 Paris', lat: 48.8452, lng: 2.3448 },
  { id: 'partner-9', shop_name: 'Ten Belles Bread Bastille', shop_address: '17-19 Rue Breguet, 75011 Paris', lat: 48.8555, lng: 2.3718 },
];

// Calculate Haversine distance in meters between two lat/lng coordinates
function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function SurplusRadarMap({ 
  studentCoords, 
  studentAddress = '40 Rue du Docteur Roux, 75015 Paris',
  pulses = [], 
  selectedZoneName = 'Your Location',
  onClaimPulse,
  onLocationChange,
  activeClaim = null,
  claimLoading = false
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const studentCircleRef = useRef(null);
  const studentMarkerRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // 1. Initialize Leaflet Map with free OpenStreetMap tiles
  useEffect(() => {
    let checkInterval;

    const initLeaflet = () => {
      if (window.L && mapContainerRef.current && !mapInstanceRef.current) {
        try {
          const L = window.L;
          const map = L.map(mapContainerRef.current, {
            center: [studentCoords.lat, studentCoords.lng],
            zoom: 15,
            zoomControl: true,
          });

          L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
          }).addTo(map);

          markersLayerRef.current = L.layerGroup().addTo(map);
          mapInstanceRef.current = map;
          setMapReady(true);
        } catch (err) {
          console.error('Failed to initialize Leaflet map:', err);
        }
      }
    };

    if (window.L) {
      initLeaflet();
    } else {
      checkInterval = setInterval(() => {
        if (window.L) {
          clearInterval(checkInterval);
          initLeaflet();
        }
      }, 150);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
        studentMarkerRef.current = null;
        studentCircleRef.current = null;
      }
    };
  }, []);

  // 2. Render Student Marker (with exact street address), 1km Geofence Circle, and Boulangeries
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !window.L || !studentCoords) return;
    const L = window.L;
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;

    const studentLat = Number(studentCoords.lat);
    const studentLng = Number(studentCoords.lng);

    // Smoothly fly to student's exact street position
    map.flyTo([studentLat, studentLng], 15, { duration: 1.0 });

    const shortLabel = studentAddress
      ? studentAddress.split(',')[0]
      : 'You (Student)';

    const studentIcon = L.divIcon({
      className: 'student-custom-marker-wrapper',
      html: `
        <div class="student-marker-container">
          <div class="student-marker-pulse-ring"></div>
          <div class="student-marker-core" title="Drag to adjust your exact location">🎓</div>
          <div class="student-marker-label">🎓 ${shortLabel}</div>
        </div>
      `,
      iconSize: [160, 58],
      iconAnchor: [80, 24],
    });

    if (studentMarkerRef.current) {
      studentMarkerRef.current.setLatLng([studentLat, studentLng]);
      studentMarkerRef.current.setIcon(studentIcon);
    } else {
      studentMarkerRef.current = L.marker([studentLat, studentLng], {
        icon: studentIcon,
        draggable: true,
        zIndexOffset: 1000,
      }).addTo(map);

      studentMarkerRef.current.on('dragend', (evt) => {
        const pos = evt.target.getLatLng();
        if (onLocationChange) {
          onLocationChange(pos.lat, pos.lng);
        }
      });
    }

    studentMarkerRef.current.bindPopup(`
      <div class="boulangerie-popup-card">
        <div class="popup-header">
          <h4 class="popup-title">🎓 Your Exact Student Location</h4>
        </div>
        <p class="popup-address" style="font-weight:600;color:#0F172A;">📍 ${studentAddress}</p>
        <div class="popup-item" style="background:#EFF6FF;border-color:#BFDBFE;color:#1E40AF;">
          <strong>GPS Coordinates:</strong> ${studentLat.toFixed(5)}° N, ${studentLng.toFixed(5)}° E<br/>
          <span>1,000m real-time geofence active around this address. (Tip: You can drag your blue pin!)</span>
        </div>
      </div>
    `);

    // 1,000m Geofence Radar Circle
    if (studentCircleRef.current) {
      studentCircleRef.current.setLatLng([studentLat, studentLng]);
    } else {
      studentCircleRef.current = L.circle([studentLat, studentLng], {
        radius: 1000,
        color: '#2563EB',
        weight: 2,
        dashArray: '6, 6',
        fillColor: '#3B82F6',
        fillOpacity: 0.10,
      }).addTo(map);
    }

    markersLayer.clearLayers();

    // A) Render Live Surplus Pulses from Backend
    const renderedShopNames = new Set();
    pulses.forEach((pulse, idx) => {
      let bLat = pulse.latitude ? Number(pulse.latitude) : null;
      let bLng = pulse.longitude ? Number(pulse.longitude) : null;

      if (!bLat || !bLng) {
        const angle = (idx * 137.5 * Math.PI) / 180;
        const distDeg = 0.0035;
        bLat = studentLat + Math.cos(angle) * distDeg;
        bLng = studentLng + Math.sin(angle) * distDeg;
      }

      renderedShopNames.add((pulse.shop_name || '').toLowerCase());
      const distMeters = Math.round(
        pulse.distance_meters ?? getDistanceMeters(studentLat, studentLng, bLat, bLng)
      );

      const bakeryIcon = L.divIcon({
        className: 'boulangerie-custom-marker-wrapper',
        html: `
          <div class="boulangerie-marker-container">
            <div class="boulangerie-pin active-pulse-pin">
              <span class="bakery-emoji">🥖</span>
              <span class="boulangerie-badge">${pulse.quantity_remaining}</span>
            </div>
            <div class="boulangerie-marker-label">${pulse.shop_name}</div>
          </div>
        `,
        iconSize: [130, 62],
        iconAnchor: [65, 48],
      });

      const popupHtml = `
        <div class="boulangerie-popup-card">
          <div class="popup-header">
            <h4 class="popup-title">🥖 ${pulse.shop_name}</h4>
            <span class="popup-dist">${distMeters}m</span>
          </div>
          <p class="popup-address">📍 ${pulse.shop_address || 'Paris'}</p>
          <div class="popup-item">
            <strong>${pulse.item_name}</strong>
            ${pulse.description ? `<p class="popup-desc">${pulse.description}</p>` : ''}
          </div>
          <div class="popup-footer">
            <span class="popup-qty">● ${pulse.quantity_remaining} baskets available</span>
            <button class="popup-claim-btn" id="claim-btn-${pulse.pulse_id}" ${activeClaim || claimLoading || pulse.quantity_remaining <= 0 ? 'disabled' : ''}>
              Claim Free Meal
            </button>
          </div>
        </div>
      `;

      const marker = L.marker([bLat, bLng], { icon: bakeryIcon, zIndexOffset: 500 })
        .addTo(markersLayer)
        .bindPopup(popupHtml, {
          className: 'boulangerie-popup-wrapper',
          maxWidth: 280,
          offset: [0, -32],
        });

      marker.on('popupopen', () => {
        const btn = document.getElementById(`claim-btn-${pulse.pulse_id}`);
        if (btn) {
          btn.onclick = () => {
            if (onClaimPulse) onClaimPulse(pulse);
            marker.closePopup();
          };
        }
      });
    });

    // B) Render Partner Boulangeries not already in active pulses
    PARTNER_BOULANGERIES.forEach((partner) => {
      if (renderedShopNames.has(partner.shop_name.toLowerCase())) return;

      const distMeters = Math.round(getDistanceMeters(studentLat, studentLng, partner.lat, partner.lng));
      const inGeofence = distMeters <= 1000;

      const partnerIcon = L.divIcon({
        className: 'boulangerie-custom-marker-wrapper',
        html: `
          <div class="boulangerie-marker-container">
            <div class="boulangerie-pin ${inGeofence ? 'partner-nearby-pin' : 'partner-far-pin'}">
              <span class="bakery-emoji">🥐</span>
            </div>
            <div class="boulangerie-marker-label">${partner.shop_name}</div>
          </div>
        `,
        iconSize: [120, 58],
        iconAnchor: [60, 44],
      });

      const popupHtml = `
        <div class="boulangerie-popup-card">
          <div class="popup-header">
            <h4 class="popup-title">🥐 ${partner.shop_name}</h4>
            <span class="popup-dist">${distMeters}m away</span>
          </div>
          <p class="popup-address">📍 ${partner.shop_address}</p>
          <div class="popup-item">
            <strong>Vif Partner Boulangerie</strong>
            <p class="popup-desc">
              ${inGeofence 
                ? 'Inside your 1km geofence! Click Refresh Radar to check active drops.' 
                : 'Partner bakery in Paris outside your current 1km circle.'}
            </p>
          </div>
        </div>
      `;

      L.marker([partner.lat, partner.lng], { icon: partnerIcon })
        .addTo(markersLayer)
        .bindPopup(popupHtml, {
          className: 'boulangerie-popup-wrapper',
          maxWidth: 260,
          offset: [0, -28],
        });
    });
  }, [mapReady, studentCoords, studentAddress, pulses, selectedZoneName, activeClaim, claimLoading, onClaimPulse, onLocationChange]);

  const toggleExpand = () => {
    setIsExpanded((prev) => !prev);
    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 250);
  };

  return (
    <div className={`radar-map-wrapper glass-panel ${isExpanded ? 'radar-map-expanded' : ''}`}>
      <div className="radar-map-header">
        <div className="radar-map-title-row">
          <div className="radar-live-dot"></div>
          <span className="radar-map-title">Live Map: Student &amp; Boulangerie Locations</span>
          <span className="badge badge-amber" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
            1,000m Radar
          </span>
        </div>

        <div className="radar-map-controls">
          <span className="radar-legend-item">
            <span className="legend-dot legend-student"></span> 🎓 You ({studentAddress.split(',')[0]})
          </span>
          <span className="radar-legend-item">
            <span className="legend-dot legend-bakery"></span> 🥖 Active Surplus ({pulses.length})
          </span>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm" 
            onClick={toggleExpand}
            title={isExpanded ? 'Collapse Map' : 'Expand Fullscreen'}
            style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            <span style={{ fontSize: '0.75rem' }}>{isExpanded ? 'Shrink' : 'Expand'}</span>
          </button>
        </div>
      </div>

      <div className="map-view-container" ref={mapContainerRef}>
        {!mapReady && (
          <div className="map-loading-overlay">
            <p>Loading OpenStreetMap Paris Radar...</p>
          </div>
        )}
      </div>

      <div className="radar-map-footer-hint">
        <span>📍 <strong>Your Exact Location:</strong> <strong style={{ color: '#0F172A' }}>{studentAddress}</strong> ({studentCoords.lat.toFixed(5)}°N, {studentCoords.lng.toFixed(5)}°E) · Drag your blue pin 🎓 or search any street address above.</span>
      </div>
    </div>
  );
}
