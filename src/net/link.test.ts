import { describe, expect, it } from "vitest";
import { roomFromHash, hashFor, newRoomId } from "./link";

describe("room link", () => {
  it("reads the room id from the hash", () => {
    expect(roomFromHash("#g=AbCdEfGhIjKlMnOpQrStUv")).toBe("AbCdEfGhIjKlMnOpQrStUv");
  });

  it("ignores a hash that is not a room", () => {
    expect(roomFromHash("")).toBeNull();
    expect(roomFromHash("#other")).toBeNull();
    expect(roomFromHash("#g=short")).toBeNull();
    expect(roomFromHash("#g=has spaces and more than enough chars")).toBeNull();
  });

  it("writes the hash for a room", () => {
    expect(hashFor("AbCdEfGhIjKlMnOpQrStUv")).toBe("#g=AbCdEfGhIjKlMnOpQrStUv");
  });

  it("makes ids of 128 random bits that read back", () => {
    const a = newRoomId();
    expect(a).toHaveLength(22);
    expect(roomFromHash(hashFor(a))).toBe(a);
    expect(newRoomId()).not.toBe(a);
  });
});
