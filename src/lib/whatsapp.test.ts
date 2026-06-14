import { describe, it, expect } from "vitest";
import { toWhatsAppNumber, whatsAppLink } from "./whatsapp";

describe("toWhatsAppNumber", () => {
  it("strips +, spaces and dashes from an international number", () => {
    expect(toWhatsAppNumber("+91 98765 43210")).toBe("919876543210");
    expect(toWhatsAppNumber("+91-98765-43210")).toBe("919876543210");
  });

  it("prepends the India country code to a bare 10-digit mobile", () => {
    expect(toWhatsAppNumber("9876543210")).toBe("919876543210");
  });

  it("drops a leading zero before adding the country code", () => {
    expect(toWhatsAppNumber("09876543210")).toBe("919876543210");
  });

  it("keeps an already-prefixed number as-is", () => {
    expect(toWhatsAppNumber("919876543210")).toBe("919876543210");
  });

  it("returns null for empty or unusable input", () => {
    expect(toWhatsAppNumber("")).toBeNull();
    expect(toWhatsAppNumber(null)).toBeNull();
    expect(toWhatsAppNumber(undefined)).toBeNull();
    expect(toWhatsAppNumber("12345")).toBeNull();
  });
});

describe("whatsAppLink", () => {
  it("builds a wa.me chat link with encoded text", () => {
    expect(whatsAppLink("+91 98765 43210", "hi there")).toBe("https://wa.me/919876543210?text=hi%20there");
  });

  it("returns null when the number is unusable", () => {
    expect(whatsAppLink(null, "hi")).toBeNull();
  });
});
