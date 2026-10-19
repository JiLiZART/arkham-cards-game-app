import { describe, expect, it } from "vitest";
import { candidateFile, isLocalRequest, parseChoice, parseChoices } from "./sounds-dev-server";

describe("isLocalRequest", () => {
  it("accepts a loopback peer asking for localhost", () => {
    expect(isLocalRequest("localhost:5173", "127.0.0.1")).toBe(true);
    expect(isLocalRequest("127.0.0.1:5173", "::ffff:127.0.0.1")).toBe(true);
    expect(isLocalRequest("[::1]:5173", "::1", "http://[::1]:5173")).toBe(true);
  });

  it("refuses another peer, another host name (DNS rebinding) and another origin", () => {
    expect(isLocalRequest("localhost:5173", "192.168.1.20")).toBe(false);
    expect(isLocalRequest("evil.example:5173", "127.0.0.1")).toBe(false);
    expect(isLocalRequest("localhost:5173", "127.0.0.1", "https://evil.example")).toBe(false);
    expect(isLocalRequest(undefined, "127.0.0.1")).toBe(false);
  });
});

describe("candidateFile", () => {
  it("maps a request path under /__sounds-src/ into sounds-src/candidates", () => {
    expect(candidateFile("/__sounds-src/moment-draw/ab12cd34.mp3")).toBe("sounds-src/candidates/moment-draw/ab12cd34.mp3");
    expect(candidateFile("/__sounds-src/a%20b/c.mp3")).toBe("sounds-src/candidates/a b/c.mp3");
  });

  it("refuses a path that leaves the folder, an absolute path and other prefixes", () => {
    expect(candidateFile("/__sounds-src/../../package.json")).toBeNull();
    expect(candidateFile("/__sounds-src/%2e%2e/secret")).toBeNull();
    expect(candidateFile("/__sounds-src//etc/passwd")).toBeNull();
    expect(candidateFile("/other/x.mp3")).toBeNull();
  });
});

describe("parseChoice", () => {
  it("reads a slot with a candidate number, none or current", () => {
    expect(parseChoice('{"slot":"moment:draw","candidate":3}')).toEqual({ slot: "moment:draw", candidate: 3 });
    expect(parseChoice('{"slot":"moment:draw","candidate":"none"}')).toEqual({ slot: "moment:draw", candidate: "none" });
    expect(parseChoice('{"slot":"moment:draw","candidate":"current"}')).toEqual({ slot: "moment:draw", candidate: "current" });
  });

  it("refuses anything else", () => {
    for (const bad of ["not json", "{}", '{"slot":1,"candidate":0}', '{"slot":"a","candidate":-1}', '{"slot":"a","candidate":1.5}', '{"slot":"a","candidate":"all"}', '{"slot":"a","candidate":0,"x":1}']) expect(() => parseChoice(bad), bad).toThrow();
  });
});

describe("parseChoices", () => {
  it("reads every slot's choice", () => {
    expect(parseChoices('{"choices":[{"slot":"moment:draw","candidate":11},{"slot":"event:doom","candidate":"none"}]}')).toEqual([
      { slot: "moment:draw", candidate: 11 },
      { slot: "event:doom", candidate: "none" },
    ]);
  });

  it("refuses an empty batch and a bad entry", () => {
    expect(() => parseChoices('{"choices":[]}')).toThrow();
    expect(() => parseChoices('{"choices":[{"slot":"a","candidate":"x"}]}')).toThrow();
  });
});
