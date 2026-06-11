import { describe, it, expect } from "vitest";
import { mapsHref, hasMapTarget } from "./maps";

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
