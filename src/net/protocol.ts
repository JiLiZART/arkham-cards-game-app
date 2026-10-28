/**
 * What the browser and the room server say to each other (ADR-0019). Imported by both sides, so it depends on nothing
 * of the game: a custom deck is an opaque payload to the server.
 */

/** bumped when messages change shape; a browser and a server that differ don't talk */
export const PROTOCOL = 1;

/** a seat's choice of deck, made in the lobby */
export interface DeckPick<Deck = unknown> {
  deckId: string;
  /** a custom deck saved on the player's device */
  deck?: Deck;
}

export type Difficulty = "easy" | "standard" | "hard" | "expert";

export interface Lobby {
  campaignId: string | null;
  difficulty: Difficulty;
}

export interface Player {
  id: string;
  name: string;
  /** a socket is open for this player */
  online: boolean;
  /** when it last was (ms), for releasing the seats of a player who is gone */
  lastSeen: number;
  /** when they first joined, to break ties between equal logs */
  joinedAt: number;
}

/** the room as every member sees it: public to the room, never holding a player key */
export interface Roster<Deck = unknown> {
  version: { app: string; engine: number };
  mode: "lobby" | "game";
  /** the player id of the host, null before anyone joined */
  host: string | null;
  players: Record<string, Player>;
  lobby: Lobby;
  /** investigator code to the player id holding it */
  seats: Record<string, string>;
  /** lobby: each held seat's deck; game: absent */
  picks: Record<string, DeckPick<Deck>>;
  /** game: the investigators of the game, claimed or not */
  invs: string[];
  /** how many moves each connected player's log holds, for choosing a new host */
  have: Record<string, number>;
}

/** player to room */
export type ToRoom<Deck = unknown> =
  | {
      t: "hello";
      key: string;
      name: string;
      app: string;
      engine: number;
      protocol: number;
      have: number;
    }
  | { t: "lobby"; lobby: Partial<Lobby> }
  | { t: "claim"; inv: string; pick?: DeckPick<Deck> }
  | { t: "release"; inv: string }
  /** the host frees the seats of a player who has been gone for a while */
  | { t: "releaseAway"; id: string }
  /** the host closes the lobby; the campaign starts as a move */
  | { t: "start" }
  /** the host opens the room on a saved campaign: its investigators are the seats to claim */
  | { t: "open"; invs: string[] }
  | { t: "have"; n: number }
  | { t: "rename"; name: string }
  /** connection setup for another player's peer connection */
  | { t: "signal"; to: string; data: unknown };

/** room to player */
export type FromRoom<Deck = unknown> =
  | { t: "welcome"; you: string; roster: Roster<Deck> }
  | { t: "roster"; roster: Roster<Deck> }
  | { t: "signal"; from: string; data: unknown }
  | { t: "error"; key: RoomError; detail?: string };

/** i18n keys (`net.error.*`) */
export type RoomError =
  | "net.error.version"
  | "net.error.protocol"
  | "net.error.notHost"
  | "net.error.taken"
  | "net.error.noSeat"
  | "net.error.lobbyClosed"
  | "net.error.notAway"
  | "net.error.nothingToStart"
  | "net.error.unknown";

/** how long a player must be gone before the host may release their seats */
export const AWAY_MS = 2 * 60 * 1000;

/** a room id or player key: 128 random bits, base64url */
export function randomToken(bytes = 16): string {
  const b = new Uint8Array(bytes);
  crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** the player id for a key: its SHA-256 as hex, so the server never keeps the key */
export async function playerId(key: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

/** the investigators nobody holds yet (game mode) */
export const freeSeats = (r: Pick<Roster, "invs" | "seats">): string[] =>
  r.invs.filter((i) => !r.seats[i]);
