import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, Navigation, Clock, X } from 'lucide-react';

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
  selectedRouteTarget = null,
  onClearRouteTarget,
  onRouteCalculated,
  claimLoading = false
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const routeLayerRef = useRef(null);
  const studentCircleRef = useRef(null);
  const studentMarkerRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [routeSummary, setRouteSummary] = useState(null);

  // Determine which bakery we should draw a road route to (Active Claim takes priority, or user-clicked route preview)
  const routeTarget = activeClaim && (activeClaim.latitude || activeClaim.longitude)
    ? activeClaim
    : selectedRouteTarget;

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

          routeLayerRef.current = L.layerGroup().addTo(map);
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
        routeLayerRef.current = null;
        studentMarkerRef.current = null;
        studentCircleRef.current = null;
      }
    };
  }, []);

  // 2. Render Student Marker, 1km Geofence Circle, and ONLY Database Boulangerie Markers
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !window.L || !studentCoords) return;
    const L = window.L;
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;

    const studentLat = Number(studentCoords.lat);
    const studentLng = Number(studentCoords.lng);

    if (!routeTarget) {
      map.flyTo([studentLat, studentLng], 15, { duration: 1.0 });
    }

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
          <span>1,000m real-time geofence active around this address.</span>
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
        fillOpacity: 0.08,
      }).addTo(map);
    }

    // Clear and render ONLY Database Boulangerie markers
    markersLayer.clearLayers();

    // Combine nearby DB pulses + activeClaim bakery (if not already in pulses list)
    const dbBakeries = [...pulses];
    if (
      activeClaim &&
      activeClaim.latitude &&
      activeClaim.longitude &&
      !dbBakeries.some((p) => p.pulse_id === activeClaim.pulse_id || p.shop_name === activeClaim.shop_name)
    ) {
      dbBakeries.push({
        pulse_id: activeClaim.pulse_id || 'claimed',
        shop_name: activeClaim.shop_name,
        shop_address: activeClaim.shop_address,
        item_name: activeClaim.item_name,
        quantity_remaining: 1,
        latitude: activeClaim.latitude,
        longitude: activeClaim.longitude,
        distance_meters: activeClaim.distance_meters,
      });
    }

    dbBakeries.forEach((pulse) => {
      if (!pulse.latitude || !pulse.longitude) return;
      const bLat = Number(pulse.latitude);
      const bLng = Number(pulse.longitude);

      const distMeters = Math.round(
        pulse.distance_meters ?? getDistanceMeters(studentLat, studentLng, bLat, bLng)
      );
      const walkMins = Math.max(1, Math.round(distMeters / 80));

      const isClaimedTarget =
        routeTarget &&
        (routeTarget.pulse_id === pulse.pulse_id || routeTarget.shop_name === pulse.shop_name);

      const bakeryIcon = L.divIcon({
        className: 'boulangerie-custom-marker-wrapper',
        html: `
          <div class="boulangerie-marker-container">
            <div class="boulangerie-pin ${isClaimedTarget ? 'partner-nearby-pin' : 'active-pulse-pin'}">
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
            <span class="popup-dist">🚶 ${walkMins} min (${distMeters}m)</span>
          </div>
          <p class="popup-address">📍 ${pulse.shop_address || 'Paris'}</p>
          <div class="popup-item">
            <strong>${pulse.item_name}</strong>
            ${pulse.description ? `<p class="popup-desc">${pulse.description}</p>` : ''}
          </div>
          <div class="popup-footer">
            <span class="popup-qty">● ${pulse.quantity_remaining} baskets left</span>
            <button class="popup-claim-btn" id="claim-btn-${pulse.pulse_id}" ${activeClaim || claimLoading || pulse.quantity_remaining <= 0 ? 'disabled' : ''}>
              ${activeClaim ? 'Claimed' : 'Claim Free Meal'}
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
  }, [mapReady, studentCoords, studentAddress, pulses, selectedZoneName, activeClaim, routeTarget, claimLoading, onClaimPulse, onLocationChange]);

  // 3. Draw Real Street Route & Calculate Walking/Cycling Time when a meal is claimed (or route target selected)
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !routeLayerRef.current || !window.L) return;
    const L = window.L;
    const map = mapInstanceRef.current;
    const routeLayer = routeLayerRef.current;
    routeLayer.clearLayers();

    if (!routeTarget || !routeTarget.latitude || !routeTarget.longitude || !studentCoords) {
      setRouteSummary(null);
      if (onRouteCalculated) onRouteCalculated(null);
      return;
    }

    const startLat = Number(studentCoords.lat);
    const startLng = Number(studentCoords.lng);
    const endLat = Number(routeTarget.latitude);
    const endLng = Number(routeTarget.longitude);

    let cancelled = false;

    const fetchAndDrawRoute = async () => {
      let coordsLatLng = [
        [startLat, startLng],
        [endLat, endLng],
      ];
      let roadDistMeters = getDistanceMeters(startLat, startLng, endLat, endLng) * 1.25;

      try {
        // Query OpenStreetMap Foot Routing Engine for real Paris street path
        const url = `https://routing.openstreetmap.de/routed-foot/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
        const resp = await fetch(url);
        if (resp.ok) {
          const data = await resp.json();
          if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            roadDistMeters = route.distance || roadDistMeters;
            if (route.geometry && Array.isArray(route.geometry.coordinates)) {
              coordsLatLng = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
            }
          }
        }
      } catch (err) {
        console.warn('Fallback to direct line route:', err);
      }

      if (cancelled) return;

      // Walking speed ~4.8 km/h (80m/min), Cycling ~15 km/h (250m/min)
      const walkMinutes = Math.max(1, Math.round(roadDistMeters / 80));
      const bikeMinutes = Math.max(1, Math.round(roadDistMeters / 250));
      const roundedDist = Math.round(roadDistMeters);

      const summary = {
        shopName: routeTarget.shop_name,
        shopAddress: routeTarget.shop_address,
        walkMinutes,
        bikeMinutes,
        distanceMeters: roundedDist,
        isClaimed: Boolean(activeClaim),
      };

      setRouteSummary(summary);
      if (onRouteCalculated) onRouteCalculated(summary);

      // Draw outer glow line
      L.polyline(coordsLatLng, {
        color: '#10B981',
        weight: 8,
        opacity: 0.35,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(routeLayer);

      // Draw crisp inner road path line
      const mainLine = L.polyline(coordsLatLng, {
        color: '#059669',
        weight: 4,
        opacity: 0.95,
        dashArray: '8, 8',
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(routeLayer);

      // Fit map bounds to show both Student and Boulangerie along the road route
      try {
        map.fitBounds(mainLine.getBounds(), { padding: [55, 55], maxZoom: 16 });
      } catch (e) {
        // ignore bounds error
      }
    };

    fetchAndDrawRoute();

    return () => {
      cancelled = true;
    };
  }, [mapReady, studentCoords, routeTarget, activeClaim]);

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
          <span className="radar-map-title">Live Map: Student &amp; DB Boulangeries Within 1km</span>
          <span className="badge badge-amber" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
            1,000m Radar
          </span>
        </div>

        <div className="radar-map-controls">
          <span className="radar-legend-item">
            <span className="legend-dot legend-student"></span> 🎓 You ({studentAddress.split(',')[0]})
          </span>
          <span className="radar-legend-item">
            <span className="legend-dot legend-bakery"></span> 🥖 DB Boulangeries Nearby ({pulses.length})
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

      {/* Active Road Route & Travel Time Banner */}
      {routeSummary && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          background: '#ECFDF5',
          border: '1px solid #A7F3D0',
          borderRadius: '10px',
          padding: '10px 14px',
          color: '#065F46'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span className="badge badge-emerald" style={{ background: '#059669', color: '#FFFFFF', padding: '4px 10px' }}>
              <Navigation size={12} style={{ marginRight: '4px' }} />
              {routeSummary.isClaimed ? 'Active Pickup Route' : 'Road Route Preview'}
            </span>
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
              To {routeSummary.shopName} ({routeSummary.shopAddress})
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.85rem', fontWeight: 700 }}>
            <span style={{ background: '#FFFFFF', padding: '4px 10px', borderRadius: '999px', border: '1px solid #6EE7B7' }}>
              🚶 {routeSummary.walkMinutes} min walk
            </span>
            <span style={{ background: '#FFFFFF', padding: '4px 10px', borderRadius: '999px', border: '1px solid #6EE7B7' }}>
              🚲 {routeSummary.bikeMinutes} min bike
            </span>
            <span style={{ color: '#047857' }}>
              📏 {routeSummary.distanceMeters} m road distance
            </span>
            {!routeSummary.isClaimed && onClearRouteTarget && (
              <button
                type="button"
                onClick={onClearRouteTarget}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#065F46', display: 'flex', alignItems: 'center' }}
                title="Clear route preview"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="map-view-container" ref={mapContainerRef}>
        {!mapReady && (
          <div className="map-loading-overlay">
            <p>Loading OpenStreetMap Paris Radar...</p>
          </div>
        )}
      </div>

      <div className="radar-map-footer-hint">
        <span>📍 <strong>Your Exact Location:</strong> <strong style={{ color: '#0F172A' }}>{studentAddress}</strong> · Showing only database boulangeries within 1 km. Claim a meal or click "Route on Map" to view the street path &amp; walking time.</span>
      </div>
    </div>
  );
}
