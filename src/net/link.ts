/** The room link: `#g=<id>` in the address (the hash never reaches a server log). */
import { randomToken } from "./protocol";

const ROOM = /^#g=([A-Za-z0-9_-]{16,64})$/;

export const roomFromHash = (hash: string): string | null => ROOM.exec(hash)?.[1] ?? null;

export const hashFor = (id: string): string => `#g=${id}`;

/** a new room: 128 random bits */
export const newRoomId = (): string => randomToken(16);
