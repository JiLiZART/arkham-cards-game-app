// Fragile Thoughts — discard events from your hand with a total printed cost of at least X, X the shroud of your
// location, one at a time as you choose; none discarded: it gains surge (Corrosion's rule, over events in hand).
import { def, inv } from "../../../../src/engine/api";
import { discardToShroud } from "../../ptc/scripts/03102";

export default discardToShroud(
  "52067",
  (game, i) => inv(game, i).hand.filter((id) => def(game, id).type === "event"),
  { text: "Choose an event to discard", key: "fragileThoughts" },
);
