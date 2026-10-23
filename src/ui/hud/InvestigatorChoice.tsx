import { useEffect } from "react";
import { cardText } from "../../content/i18n";
import { db, gameStore, useGame } from "../context";
import { instructionParts } from "../instruction";
import { choicesOffered, delayed, investigatorChoice } from "../players";
import { Portrait } from "../Portrait";
import { useView } from "../view";
import { Sentence } from "./Feed";
import { moment } from "./SoundLayer";

/** how long the only eligible investigator is shown before the choice is made for the player */
export const AUTO_PICK_MS = 1000;

/**
 * A choice among investigators (who takes the damage, who a card affects) as large avatars across the middle of the
 * screen, with the prompt above; a tap submits it, as does the bar's avatar. With exactly one eligible investigator the
 * avatar is shown for a second and the choice is then made by itself, through an ordinary choice, so Undo and replays
 * treat it like any other. The timer is view state (ADR-0004).
 */
export function InvestigatorChoiceOverlay() {
  const game = useGame((s) => s.game)!;
  const locale = useGame((s) => s.locale);
  const choose = useGame((s) => s.choose);
  const busy = useGame((s) => !!s.current || s.queue.length > 0);
  const viewing = useView((s) => s.viewing);
  // the test screen and the paced pause don't stop it; a title, the introduction or drawn cards in the middle do
  const free = useView(
    (s) =>
      s.stage.every((k) => k.startsWith("test:") || k.startsWith("pause:")) &&
      !s.intro &&
      s.showcase.length === 0,
  );
  const choice = investigatorChoice(game);
  const show = !!choice && choicesOffered(game, { viewing }) && !busy && free;
  const seq = game.pending?.seq;
  const single = choice?.single ? choice.options[0].id : null;
  useEffect(() => {
    if (!show || !single) return;
    return delayed(
      AUTO_PICK_MS,
      () => gameStore.getState().game?.pending?.seq === seq,
      () => {
        moment("avatarChoice");
        gameStore.getState().choose(single);
      },
    );
  }, [show, seq, single]);
  if (!show || !choice || !game.pending) return null;
  return (
    <div className="inv-choice" role="group">
      <div className="inv-choice-prompt">
        <Sentence parts={instructionParts(game.pending, game, db, locale)} size={30} />
      </div>
      <div className="inv-choice-row">
        {choice.options.map((o) => (
          <button
            key={o.id}
            className="inv-choice-avatar legal"
            onClick={() => {
              moment("avatarChoice");
              choose(o.id);
            }}
          >
            <Portrait code={o.inv} size={104} />
            <b>{cardText(db, o.inv, locale).name}</b>
          </button>
        ))}
      </div>
    </div>
  );
}
