import { describe, it, expect } from "vitest";
import { sniffImage } from "./imageSniff";

const bytes = (...b: number[]) => new Uint8Array(b);

describe("sniffImage — magic-byte validation", () => {
  it("recognizes real image signatures", () => {
    expect(sniffImage(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("jpeg");
    expect(sniffImage(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("png");
    expect(sniffImage(bytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61))).toBe("gif");
    expect(sniffImage(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50))).toBe("webp");
    expect(sniffImage(bytes(0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66))).toBe("avif");
  });

  it("rejects a text/script payload disguised as an image", () => {
    // "GIF" prefix missing version, or a PHP/HTML/text file
    expect(sniffImage(new TextEncoder().encode("<?php system($_GET[0]); ?>"))).toBeNull();
    expect(sniffImage(new TextEncoder().encode("<script>alert(1)</script>"))).toBeNull();
    expect(sniffImage(bytes(0x89, 0x50, 0x4e))).toBeNull(); // truncated PNG
  });
});
