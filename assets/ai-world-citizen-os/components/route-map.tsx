"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapPin } from "lucide-react";
import { routeCities } from "@/lib/mock-data";
import type { RouteCityView } from "@/lib/supabase/cities";

export function RouteMap({ cities = routeCities }: { cities?: RouteCityView[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [selectedCity, setSelectedCity] = useState(cities[0] ?? routeCities[0]);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    setSelectedCity(cities[0] ?? routeCities[0]);
  }, [cities]);

  useEffect(() => {
    if (!mapRef.current || !token) {
      return;
    }

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [48.6, 39.6],
      zoom: 3,
    });

    map.on("load", () => {
      const coordinates = cities.map((city) => [city.lng, city.lat]);

      map.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates,
          },
        },
      });

      map.addLayer({
        id: "route",
        type: "line",
        source: "route",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#486A7A",
          "line-width": 3,
          "line-opacity": 0.8,
        },
      });

      cities.forEach((city) => {
        const marker = document.createElement("button");
        marker.type = "button";
        marker.className = "h-4 w-4 rounded-full border-2 border-white bg-accent-orange shadow-lg";
        marker.setAttribute("aria-label", city.name);
        marker.addEventListener("click", () => setSelectedCity(city));

        new mapboxgl.Marker(marker).setLngLat([city.lng, city.lat]).addTo(map);
      });
    });

    return () => map.remove();
  }, [cities, token]);

  return (
    <div className="grid gap-3 md:gap-4 lg:grid-cols-[1.5fr_0.85fr]">
      <div className="relative min-h-[208px] overflow-hidden rounded-[var(--radius-large)] border border-border-soft bg-surface-muted md:min-h-[420px]">
        {token ? (
          <div ref={mapRef} className="h-full min-h-[208px] w-full md:min-h-[420px]" />
        ) : (
          <div className="flex h-full min-h-[208px] flex-col justify-between p-3 md:min-h-[420px] md:p-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground md:text-base">旅行路线</h3>
              <p className="mt-1 text-xs leading-[1.5] text-muted-foreground md:text-sm">地图暂未启用，你仍可以查看完整行程路线。</p>
            </div>
            <div className="mt-3 space-y-2 pr-1 md:mt-4 md:space-y-3 md:max-h-none">
              {cities.map((city, index) => (
                <button
                  key={`${city.name}-${city.country}-${city.days}-${index}`}
                  type="button"
                  onClick={() => setSelectedCity(city)}
                  className={`w-full grid-cols-[28px_minmax(0,1fr)] items-center gap-3 text-left ${index > 1 ? "hidden md:grid" : "grid"}`}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-semibold text-accent shadow-sm">
                    {index + 1}
                  </span>
                  <span className="min-w-0 rounded-[var(--radius-small)] border border-border-soft bg-white/80 px-3 py-2 md:px-4 md:py-3">
                    <span className="block break-words font-medium">{city.name}</span>
                    <span className="block break-words text-sm text-muted-foreground">{city.days}</span>
                  </span>
                </button>
              ))}
              {cities.length > 2 ? (
                <div className="grid grid-cols-[28px_minmax(0,1fr)] items-center gap-3 text-left md:hidden">
                  <span className="h-px w-px" />
                  <span className="rounded-[var(--radius-small)] border border-dashed border-border-soft bg-white/45 px-4 py-2 text-sm text-muted-foreground">
                    完整路线在下方继续查看
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
      <div className="rounded-[var(--radius-medium)] border border-border-soft bg-white p-3 md:p-5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground md:text-sm">
          <MapPin className="h-4 w-4 text-accent" />
          City Detail
        </div>
        <h3 className="mt-2 break-words text-[22px] font-semibold leading-tight tracking-normal md:mt-4 md:text-3xl">{selectedCity.name}</h3>
        <p className="mt-1 break-words text-sm text-muted-foreground md:mt-2 md:text-base">{selectedCity.country}</p>
        <div className="mt-4 space-y-2 text-xs md:mt-8 md:space-y-4 md:text-sm">
          <div className="flex items-center justify-between gap-4 border-t border-border pt-2 md:pt-4">
            <span className="text-muted-foreground">Travel window</span>
            <span className="text-right font-medium">{selectedCity.days}</span>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-border pt-2 md:pt-4">
            <span className="text-muted-foreground">Latitude</span>
            <span className="font-mono">{selectedCity.lat.toFixed(4)}</span>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-border pt-2 md:pt-4">
            <span className="text-muted-foreground">Longitude</span>
            <span className="font-mono">{selectedCity.lng.toFixed(4)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
