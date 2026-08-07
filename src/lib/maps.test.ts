import { describe, it, expect } from "vitest";
import { mapsHref, hasMapTarget, distanceKm, sortByDistance, formatKm } from "./maps";

describe("mapsHref", () => {
  it("prefers precise coordinates", () => {
    expect(mapsHref({ lat: 11.2588, lng: 75.7804, address: "EMS Stadium" }))
      .toBe("https://www.google.com/maps/search/?api=1&query=11.2588%2C75.7804");
  });
  it("falls back to address when coords are missing", () => {
    expect(mapsHref({ address: "SM Street, Kozhikode 673001" }))
      .toBe("https://www.google.com/maps/search/?api=1&query=SM%20Street%2C%20Kozhikode%20673001");
  });
  it("joins location + address when both present and no coords", () => {
    expect(mapsHref({ location: "EMS Turf A", address: "EMS Stadium" }))
      .toBe("https://www.google.com/maps/search/?api=1&query=EMS%20Turf%20A%2C%20EMS%20Stadium");
  });
  it("ignores a half-set coordinate pair", () => {
    expect(mapsHref({ lat: 11.25, lng: null, address: "EMS Stadium" }))
      .toContain("query=EMS%20Stadium");
  });
});

describe("hasMapTarget", () => {
  it("true with coords or any text", () => {
    expect(hasMapTarget({ lat: 1, lng: 2 })).toBe(true);
    expect(hasMapTarget({ address: "x" })).toBe(true);
    expect(hasMapTarget({ location: "x" })).toBe(true);
  });
  it("false with nothing usable", () => {
    expect(hasMapTarget({})).toBe(false);
    expect(hasMapTarget({ lat: 1 })).toBe(false); // half a pair, no text
  });
});

describe("distanceKm", () => {
  // Kozhikode landmarks seeded in prisma/seed.ts: EMS Turf A -> SM Street Court.
  const EMS = { lat: 11.2588, lng: 75.7804 };
  it("measures a known short hop", () => {
    const d = distanceKm(EMS, { lat: 11.2510, lng: 75.7750 });
    expect(d).toBeCloseTo(1.04, 1);
  });
  it("is zero at the same point and symmetric", () => {
    expect(distanceKm(EMS, EMS)).toBe(0);
    expect(distanceKm({ lat: 11.2510, lng: 75.7750 }, EMS)).toBeCloseTo(1.04, 1);
  });
  it("returns null — never NaN — without coordinates", () => {
    expect(distanceKm(EMS, { address: "SM Street" })).toBeNull();
    expect(distanceKm(EMS, { lat: 11.25, lng: null })).toBeNull();
  });
});

describe("sortByDistance", () => {
  const ME = { lat: 11.2588, lng: 75.7804 };
  const far    = { id: "far",    lat: 11.3200, lng: 75.8400 };
  const near   = { id: "near",   lat: 11.2510, lng: 75.7750 };
  const noGeo1 = { id: "noGeo1", lat: null, lng: null };
  const noGeo2 = { id: "noGeo2", address: "somewhere" };

  it("orders nearest first and sinks coordinate-less entries, keeping their order", () => {
    const out = sortByDistance([noGeo1, far, noGeo2, near], ME).map(x => x.id);
    expect(out).toEqual(["near", "far", "noGeo1", "noGeo2"]);
  });
  it("leaves the list untouched without an origin", () => {
    const list = [far, near];
    expect(sortByDistance(list, null)).toBe(list);
  });
});

describe("formatKm", () => {
  it("switches to metres under a kilometre", () => {
    expect(formatKm(0.45)).toBe("450 m");
    expect(formatKm(2.44)).toBe("2.4 km");
  });
});
