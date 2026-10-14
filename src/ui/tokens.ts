/** short display labels for chaos tokens */
const LABELS: Record<string, string> = { skull: "☠", cultist: "☥", tablet: "⌘", elderThing: "✵", autoFail: "✖", elderSign: "✶" };
export const tokenLabel = (t: string) => LABELS[t] ?? t;
