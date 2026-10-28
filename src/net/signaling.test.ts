import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { roomAvailable, roomSocketUrl, socketLink } from "./signaling";
import { PROTOCOL } from "./protocol";

class FakeSocket {
  static all: FakeSocket[] = [];
  sent: string[] = [];
  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(readonly url: string) {
    FakeSocket.all.push(this);
  }
  send(s: string) {
    this.sent.push(s);
  }
  close() {
    this.readyState = 3;
    this.onclose?.();
  }
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
  drop() {
    this.readyState = 3;
    this.onclose?.();
  }
}
const Impl = FakeSocket as unknown as typeof WebSocket;

beforeEach(() => {
  FakeSocket.all = [];
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

const handlers = () => {
  const states: string[] = [];
  const messages: unknown[] = [];
  return {
    states,
    messages,
    h: { onState: (s: string) => states.push(s), onMessage: (m: unknown) => messages.push(m) },
  };
};

describe("roomSocketUrl", () => {
  it("uses wss on https and ws on http", () => {
    expect(roomSocketUrl({ protocol: "https:", host: "arkham.artkost.dev" }, "abc")).toBe(
      "wss://arkham.artkost.dev/net/room/abc",
    );
    expect(roomSocketUrl({ protocol: "http:", host: "localhost:5174" }, "abc")).toBe(
      "ws://localhost:5174/net/room/abc",
    );
  });
});

describe("socketLink", () => {
  it("reports open, relays messages, and sends only when open", () => {
    const { states, messages, h } = handlers();
    const link = socketLink("ws://x/room", h as never, { WebSocketImpl: Impl });
    link.send({ t: "have", n: 1 });
    expect(FakeSocket.all[0].sent).toEqual([]);
    FakeSocket.all[0].open();
    expect(states).toEqual(["connecting", "open"]);
    link.send({ t: "have", n: 2 });
    expect(FakeSocket.all[0].sent).toEqual([JSON.stringify({ t: "have", n: 2 })]);
    FakeSocket.all[0].onmessage?.({
      data: JSON.stringify({ t: "error", key: "net.error.unknown" }),
    });
    expect(messages).toEqual([{ t: "error", key: "net.error.unknown" }]);
  });

  it("ignores a message that is not JSON", () => {
    const { messages, h } = handlers();
    socketLink("ws://x/room", h as never, { WebSocketImpl: Impl });
    FakeSocket.all[0].open();
    FakeSocket.all[0].onmessage?.({ data: "nope" });
    expect(messages).toEqual([]);
  });

  it("reconnects after a drop, with growing waits", () => {
    const { states, h } = handlers();
    socketLink("ws://x/room", h as never, { WebSocketImpl: Impl, random: () => 0 });
    FakeSocket.all[0].open();
    FakeSocket.all[0].drop();
    expect(states.at(-1)).toBe("closed");
    expect(FakeSocket.all).toHaveLength(1);
    vi.advanceTimersByTime(500);
    expect(FakeSocket.all).toHaveLength(2);
    FakeSocket.all[1].drop(); // never opened: the wait doubles
    vi.advanceTimersByTime(500);
    expect(FakeSocket.all).toHaveLength(2);
    vi.advanceTimersByTime(500);
    expect(FakeSocket.all).toHaveLength(3);
  });

  it("starts the waits over once a connection opens", () => {
    const { h } = handlers();
    socketLink("ws://x/room", h as never, { WebSocketImpl: Impl, random: () => 0 });
    FakeSocket.all[0].drop();
    vi.advanceTimersByTime(500);
    FakeSocket.all[1].drop();
    vi.advanceTimersByTime(1000);
    FakeSocket.all[2].open();
    FakeSocket.all[2].drop();
    vi.advanceTimersByTime(500);
    expect(FakeSocket.all).toHaveLength(4);
  });

  it("stays closed once closed on purpose", () => {
    const { h } = handlers();
    const link = socketLink("ws://x/room", h as never, { WebSocketImpl: Impl });
    FakeSocket.all[0].open();
    link.close();
    vi.advanceTimersByTime(60_000);
    expect(FakeSocket.all).toHaveLength(1);
  });
});

describe("roomAvailable", () => {
  const ok = (body: unknown, status = 200) =>
    (async () => new Response(JSON.stringify(body), { status })) as typeof fetch;

  it("is true when the health check answers with this protocol", async () => {
    expect(await roomAvailable(ok({ ok: true, protocol: PROTOCOL }))).toBe(true);
  });

  it("is false for another protocol, an error, a page that isn't JSON, or no answer", async () => {
    expect(await roomAvailable(ok({ ok: true, protocol: PROTOCOL + 1 }))).toBe(false);
    expect(await roomAvailable(ok({}, 404))).toBe(false);
    expect(await roomAvailable((async () => new Response("<html>")) as typeof fetch)).toBe(false);
    expect(
      await roomAvailable((async () => {
        throw new Error("offline");
      }) as typeof fetch),
    ).toBe(false);
  });
});
