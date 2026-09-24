"use client";

import { useState } from "react";

interface CollectorLocationsProps {
  initialLocations?: any[];
  showHeader?: boolean;
}

export default function CollectorLocationsClient({
  initialLocations = [],
  showHeader = true,
}: CollectorLocationsProps) {
  const [locations, setLocations] = useState<any[]>(initialLocations);
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [searchLocation, setSearchLocation] = useState("");

  const [locForm, setLocForm] = useState({
    country: "",
    countryCode: "",
    state: "",
    city: "",
    latitude: "",
    longitude: "",
    radiusKm: "25",
    priority: "50",
    priorityLabel: "MEDIUM",
  });

  const handleCreateLocation = async () => {
    try {
      const res = await fetch("/api/collector/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...locForm,
          latitude: locForm.latitude ? parseFloat(locForm.latitude) : null,
          longitude: locForm.longitude ? parseFloat(locForm.longitude) : null,
          radiusKm: parseInt(locForm.radiusKm),
          priority: parseInt(locForm.priority),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLocations([data, ...locations]);
      setShowLocationForm(false);
      setLocForm({ country: "", countryCode: "", state: "", city: "", latitude: "", longitude: "", radiusKm: "25", priority: "50", priorityLabel: "MEDIUM" });
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleToggleLocation = async (id: string) => {
    const res = await fetch(`/api/collector/locations/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle" }),
    });
    const data = await res.json();
    if (res.ok) setLocations(locations.map((l: any) => (l.id === id ? data : l)));
  };

  const handleDeleteLocation = async (id: string) => {
    if (!confirm("Delete this location? This removes rotation history for this location.")) return;
    const res = await fetch(`/api/collector/locations/${id}`, { method: "DELETE" });
    if (res.ok) setLocations(locations.filter((l: any) => l.id !== id));
  };

  const filteredLocations = locations.filter((loc: any) => {
    if (!searchLocation.trim()) return true;
    const q = searchLocation.toLowerCase();
    return loc.city.toLowerCase().includes(q) || loc.country.toLowerCase().includes(q) || loc.countryCode.toLowerCase().includes(q);
  });

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {showHeader && (
        <div className="page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 600, color: "#151927", marginBottom: 4 }}>Collector Locations</h2>
            <p style={{ fontSize: 13, color: "#60697A" }}>Target geographic discovery regions, radii, priority weights, and collection history.</p>
          </div>
          <button
            onClick={() => setShowLocationForm(!showLocationForm)}
            style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#49339A", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
          >
            {showLocationForm ? "Cancel" : "+ Add Location"}
          </button>
        </div>
      )}

      {showLocationForm && (
        <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 20, display: "grid", gap: 12 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "#151927" }}>Create New Target Location</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Country *</label>
              <input
                value={locForm.country}
                onChange={e => setLocForm({ ...locForm, country: e.target.value })}
                placeholder="United Kingdom"
                style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Country Code (2-char) *</label>
              <input
                value={locForm.countryCode}
                onChange={e => setLocForm({ ...locForm, countryCode: e.target.value.toUpperCase() })}
                placeholder="GB"
                style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>City *</label>
              <input
                value={locForm.city}
                onChange={e => setLocForm({ ...locForm, city: e.target.value })}
                placeholder="Manchester"
                style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Radius (km)</label>
              <input
                type="number"
                value={locForm.radiusKm}
                onChange={e => setLocForm({ ...locForm, radiusKm: e.target.value })}
                placeholder="25"
                style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Latitude (opt)</label>
              <input
                value={locForm.latitude}
                onChange={e => setLocForm({ ...locForm, latitude: e.target.value })}
                placeholder="53.4808"
                style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#9299A8" }}>Longitude (opt)</label>
              <input
                value={locForm.longitude}
                onChange={e => setLocForm({ ...locForm, longitude: e.target.value })}
                placeholder="-2.2426"
                style={{ width: "100%", marginTop: 4, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }}
              />
            </div>
          </div>
          <button
            onClick={handleCreateLocation}
            style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: "#49339A", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer", width: "fit-content" }}
          >
            Create Location
          </button>
        </div>
      )}

      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, padding: 14, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <input
          value={searchLocation}
          onChange={e => setSearchLocation(e.target.value)}
          placeholder="Search locations by city or country..."
          style={{ flex: 1, minWidth: 220, padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E3DF", fontSize: 13 }}
        />
        <span style={{ fontSize: 11, color: "#9299A8" }}>{filteredLocations.length} locations</span>
      </div>

      <div style={{ background: "white", border: "1px solid #E5E3DF", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#FAF9F7", borderBottom: "1px solid #E5E3DF", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#9299A8", textTransform: "uppercase" }}>
                <th style={{ padding: "10px 14px" }}>Location</th>
                <th style={{ padding: "10px 14px" }}>Country</th>
                <th style={{ padding: "10px 14px" }}>Radius</th>
                <th style={{ padding: "10px 14px" }}>Priority</th>
                <th style={{ padding: "10px 14px" }}>Last Collected</th>
                <th style={{ padding: "10px 14px" }}>Status</th>
                <th style={{ padding: "10px 14px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLocations.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "24px", textAlign: "center", color: "#9299A8", fontSize: 12 }}>
                    No locations match your search.
                  </td>
                </tr>
              ) : (
                filteredLocations.map((loc: any) => (
                  <tr key={loc.id} style={{ borderBottom: "1px solid #F0EEEA" }}>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ fontWeight: 500, color: "#151927" }}>
                        {loc.city}{loc.state ? `, ${loc.state}` : ""}
                      </div>
                      <div style={{ fontSize: 11, color: "#9299A8" }}>{loc.country}</div>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ padding: "3px 8px", borderRadius: 6, background: "#FAF9F7", border: "1px solid #E5E3DF", fontSize: 11 }}>
                        {loc.countryCode}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px", color: "#60697A" }}>{loc.radiusKm} km</td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ padding: "3px 8px", borderRadius: 6, background: loc.priorityLabel === "HIGH" ? "#FFF6E3" : "#F0ECFA", color: loc.priorityLabel === "HIGH" ? "#F29B38" : "#49339A", fontSize: 11, fontWeight: 500 }}>
                        {loc.priorityLabel}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px", color: "#60697A", fontSize: 12 }}>
                      {loc.lastCollectedAt ? new Date(loc.lastCollectedAt).toLocaleString() : "Never"}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ padding: "3px 8px", borderRadius: 6, background: loc.enabled ? "#EEF8F4" : "#F0EEEA", color: loc.enabled ? "#4FAE91" : "#9299A8", fontSize: 11, fontWeight: 500 }}>
                        {loc.enabled ? "Enabled" : "Disabled"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => handleToggleLocation(loc.id)}
                          style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #E5E3DF", background: "white", fontSize: 11, cursor: "pointer" }}
                        >
                          {loc.enabled ? "Disable" : "Enable"}
                        </button>
                        <button
                          onClick={() => handleDeleteLocation(loc.id)}
                          style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #FBD5D5", background: "#FDECEC", color: "#EC6262", fontSize: 11, cursor: "pointer" }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
