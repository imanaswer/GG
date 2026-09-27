import { describe, it, expect } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("emits header then rows", () => {
    const csv = toCsv(["ID", "Name"], [["1", "Asha"], ["2", "Ben"]]);
    expect(csv).toBe("ID,Name\r\n1,Asha\r\n2,Ben");
  });
  it("escapes commas, quotes, and newlines", () => {
    const csv = toCsv(["A"], [['he said "hi", ok\nbye']]);
    expect(csv).toBe('A\r\n"he said ""hi"", ok\nbye"');
  });
  it("neutralises leading formula characters so Excel does not execute a player's name", () => {
    expect(toCsv(["A"], [["=HYPERLINK(\"https://evil\",\"x\")"], ["+1"], ["@cmd"], ["-5"]]))
      .toBe('A\r\n"\'=HYPERLINK(""https://evil"",""x"")"\r\n\'+1\r\n\'@cmd\r\n\'-5');
  });
  it("renders null/undefined as empty", () => {
    expect(toCsv(["A", "B"], [[null as unknown as string, undefined as unknown as string]])).toBe("A,B\r\n,");
  });
});
