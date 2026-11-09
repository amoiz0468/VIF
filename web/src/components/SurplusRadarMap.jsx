import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Store, Sparkles, Layers, Maximize2, Minimize2 } from 'lucide-react';

export default function SurplusRadarMap({ 
  studentCoords, 
  pulses = [], 
  selectedZoneName = 'Your Location',
  onClaimPulse,
  activeClaim = null,
  claimLoading = false
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const studentCircleRef = useRef(null);
  const studentMarkerRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize or wait for Leaflet
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

          // CartoDB Voyager tiles - modern, clean, fast
          L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            maxZoom: 19,
            subdomains: 'abcd',
          }).addTo(map);

          markersLayerRef.current = L.layerGroup().addTo(map);
          mapInstanceRef.current = map;
          setMapLoaded(true);
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
      }
    };
  }, []);

  // Update Student Marker and 1km Geofence when coordinates change
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L || !studentCoords) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    const studentLat = studentCoords.lat;
    const studentLng = studentCoords.lng;

    // Pan smoothly to updated student position
    map.flyTo([studentLat, studentLng], 15, { duration: 1.2 });

    // Custom animated student marker icon
    const studentIcon = L.divIcon({
      className: 'student-custom-marker-wrapper',
      html: `
        <div class="student-marker-pulse-ring"></div>
        <div class="student-marker-core">
          <span>🎓</span>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    if (studentMarkerRef.current) {
      studentMarkerRef.current.setLatLng([studentLat, studentLng]);
    } else {
      studentMarkerRef.current = L.marker([studentLat, studentLng], { icon: studentIcon })
        .addTo(map)
        .bindTooltip(`<strong>You (Student)</strong><br/><span style="color:#64748B">${selectedZoneName}</span>`, {
          direction: 'top',
          offset: [0, -18],
          className: 'map-tooltip-custom',
        });
    }

    // 1000m Geofence Radar Circle
    if (studentCircleRef.current) {
      studentCircleRef.current.setLatLng([studentLat, studentLng]);
    } else {
      studentCircleRef.current = L.circle([studentLat, studentLng], {
        radius: 1000,
        color: '#F59E0B',
        weight: 2,
        dashArray: '5, 8',
        fillColor: '#F59E0B',
        fillOpacity: 0.08,
      }).addTo(map);
    }
  }, [studentCoords, mapLoaded, selectedZoneName]);

  // Update Boulangerie (Bakery) Markers when pulses change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current || !window.L) return;
    const L = window.L;
    const markersLayer = markersLayerRef.current;
    markersLayer.clearLayers();

    pulses.forEach((pulse) => {
      // Use exact coordinates if provided by backend, or synthesize realistic proximity near student
      let bLat = pulse.latitude;
      let bLng = pulse.longitude;

      if (!bLat || !bLng) {
        // Fallback approximation along distance if exact shop point was not stored
        const offsetLat = ((pulse.pulse_id ? pulse.pulse_id.charCodeAt(0) % 7 - 3 : 1) * 0.002);
        const offsetLng = ((pulse.pulse_id ? pulse.pulse_id.charCodeAt(1) % 7 - 3 : 1) * 0.003);
        bLat = studentCoords.lat + offsetLat;
        bLng = studentCoords.lng + offsetLng;
      }

      const bakeryIcon = L.divIcon({
        className: 'boulangerie-custom-marker-wrapper',
        html: `
          <div class="boulangerie-pin">
            <span class="bakery-emoji">🥖</span>
            <span class="boulangerie-badge">${pulse.quantity_remaining}</span>
          </div>
        `,
        iconSize: [42, 48],
        iconAnchor: [21, 46],
      });

      const popupHtml = `
        <div class="boulangerie-popup-card">
          <div class="popup-header">
            <h4 class="popup-title">${pulse.shop_name}</h4>
            <span class="popup-dist">${Math.round(pulse.distance_meters ?? 0)}m</span>
          </div>
          <p class="popup-address">${pulse.shop_address || 'Paris'}</p>
          <div class="popup-item">
            <strong>${pulse.item_name}</strong>
            ${pulse.description ? `<p class="popup-desc">${pulse.description}</p>` : ''}
          </div>
          <div class="popup-footer">
            <span class="popup-qty">${pulse.quantity_remaining} left</span>
            <button class="popup-claim-btn" id="claim-btn-${pulse.pulse_id}" ${activeClaim || claimLoading || pulse.quantity_remaining <= 0 ? 'disabled' : ''}>
              Claim Meal
            </button>
          </div>
        </div>
      `;

      const marker = L.marker([bLat, bLng], { icon: bakeryIcon })
        .addTo(markersLayer)
        .bindPopup(popupHtml, {
          className: 'boulangerie-popup-wrapper',
          maxWidth: 280,
          offset: [0, -32],
        });

      // Attach claim button click handler when popup opens
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
  }, [pulses, studentCoords, mapLoaded, activeClaim, claimLoading, onClaimPulse]);

  // Handle Resize on Expand/Collapse
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
          <span className="radar-map-title">Interactive Surplus Geofence Radar</span>
          <span className="badge badge-amber" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
            &lt; 1,000m Geofence
          </span>
        </div>

        <div className="radar-map-controls">
          <span className="radar-legend-item">
            <span className="legend-dot legend-student"></span> You (Student)
          </span>
          <span className="radar-legend-item">
            <span className="legend-dot legend-bakery"></span> Boulangeries ({pulses.length})
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
        {!mapLoaded && (
          <div className="map-loading-overlay">
            <div className="spin-loader"></div>
            <p>Loading Paris Map Radar...</p>
          </div>
        )}
      </div>

      <div className="radar-map-footer-hint">
        <span>📍 <strong>Circle:</strong> 1 km priority notification zone. Click any bakery pin 🥖 to view available food and claim directly.</span>
      </div>
    </div>
  );
}
