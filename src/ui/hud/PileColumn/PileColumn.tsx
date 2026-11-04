import { t } from "../../../content/i18n";
import type { ChoiceOption, GameState, InstId } from "../../../engine/world/types";
import { CardFace } from "../../components/CardFace";
import { db, gameStore, useGame } from "../../state/context";
import { Glyph } from "../../components/Icon";
import { hasSymbol, scenarioIcon } from "../../assets/icons";
import { backUrl } from "../../assets/images";
import { viewerOf } from "../../state/store";
import { deckOptions } from "../../state/players";
import { useChoicesOffered } from "../../state/usePlayers";
import { useDimmed, useView } from "../../state/view";
import { moment } from "../SoundLayer";
import { hoverProps } from "../MiniCard";
import { cx } from "../../components/cx";
import styles from "./PileColumn.module.css";
import { cardOf, cardOfIf, cardsOf, invOfIf, pileMap, pileOf } from "../../../engine/context";
import { PILE } from "../../../engine/world/constants";

const tr = (key: string, vars?: Record<string, string | number>) =>
  t(db, gameStore.getState().locale, key, vars);
/** an encounter pile's icon: its top card's set when the top is face up, else the scenario's (a face-down top stays secret) */
export function pileIcon(
  top: InstId | null,
  faceUp: boolean,
  game: Pick<GameState, "scenarioId" | "world">,
): string {
  const set = faceUp && top ? db.cards[cardOf(game, top).code]?.encounterSet : undefined;
  return set ?? scenarioIcon(game.scenarioId);
}

/** `option`: a tap on this deck answers the pending choice (a waiting draw, or the turn's Draw action): lit like a legal card */
function Pile({
  label,
  count,
  top,
  faceUp,
  kind,
  id,
  option,
}: {
  label: string;
  count: number;
  top: InstId | null;
  faceUp: boolean;
  kind: "player" | "encounter";
  id?: string;
  option?: ChoiceOption | null;
}) {
  const locale = useGame((s) => s.locale);
  const game = useGame((s) => s.game) as GameState;
  const showTop = faceUp && top && cardOfIf(game, top);
  const dimmed = useDimmed(top ?? "") && !option;
  const choose = useGame((s) => s.choose);
  return (
    <div
      className={styles.pile}
      data-pile={id}
      data-tip={id === "deck" ? "deck" : undefined}
      title={`${label}: ${count}`}
    >
      <button
        data-testid="pile-card"
        className={cx(
          styles.pileCard,
          count === 0 ? "empty" : "",
          dimmed ? "dimmed" : "",
          option ? "legal" : "",
        )}
        disabled={!showTop && !option}
        aria-label={option ? `${label}: ${tr("pile.tapToDraw")}` : undefined}
        onClick={() => {
          if (option) {
            moment("deckTap");
            return choose(option.id);
          }
          if (showTop) useView.getState().setModal({ card: top! });
        }}
        {...(showTop ? hoverProps(top) : {})}
      >
        {count > 0 &&
          (showTop ? (
            <CardFace code={cardOf(game, top!).code} locale={locale} />
          ) : (
            <img src={backUrl(kind)} alt="" draggable={false} />
          ))}
        <span className="pile-count">{count}</span>
        {kind === "encounter" && count > 0 && hasSymbol(pileIcon(top, faceUp, game)) && (
          <span className={styles.pileSet}>
            <Glyph name={pileIcon(top, faceUp, game)} size={18} />
          </span>
        )}
      </button>
      <span className={styles.pileName}>{label}</span>
    </div>
  );
}

/** encounter deck, discard, victory, side decks, then the viewer's deck and discard, down the left side */
export function PileColumn() {
  const game = useGame((s) => s.game) as GameState;
  // the piles' names follow the language
  useGame((s) => s.locale);
  const viewer = viewerOf(game);
  const me = viewer ? invOfIf(game, viewer) : null;
  // a tap on a lit deck answers the pending choice, while the decider's table is on screen
  const offered = useChoicesOffered();
  const busy = useGame((s) => !!s.current || s.queue.length > 0);
  const decks = offered
    ? deckOptions(game, viewer, busy)
    : { player: null, encounter: null, waiting: false };
  const victory = cardsOf(game).filter((c) => c.zone === "victory");
  const encounterDeck = pileOf(game, PILE.EncounterDeck);
  const encounterDiscard = pileOf(game, PILE.EncounterDiscard);
  return (
    <div className={styles.pileColumn} data-testid="pile-column">
      <Pile
        label={tr("pile.encounter")}
        count={encounterDeck.length}
        top={encounterDeck[0] ?? null}
        faceUp={false}
        kind="encounter"
        id="encounter"
        option={decks.encounter}
      />
      <Pile
        label={tr("pile.discard")}
        count={encounterDiscard.length}
        id="encounterDiscard"
        top={encounterDiscard.at(-1) ?? null}
        faceUp
        kind="encounter"
      />
      <Pile
        label={tr("pile.victory")}
        count={victory.length}
        top={victory.at(-1)?.id ?? null}
        faceUp
        kind="encounter"
      />
      {/* a side deck named "_…" only holds cards for the setup to take (generated scenarios): not a pile */}
      {Object.entries(pileMap(game))
        .filter(([key]) => key.startsWith("sideDeck:"))
        .map(([key, deck]) => [key.slice("sideDeck:".length), deck ?? []] as const)
        .filter(([name]) => !name.startsWith("_"))
        .map(([name, deck]) => (
          <Pile
            key={name}
            label={`${name[0].toUpperCase()}${name.slice(1)}`}
            count={deck.length}
            top={deck[0] ?? null}
            faceUp={false}
            kind="encounter"
          />
        ))}
      {me && (
        <>
          <div className={styles.pileDivider} />
          <Pile
            label={tr("pile.deck")}
            id="deck"
            count={me.deck.length}
            top={me.deck[0] ?? null}
            faceUp={false}
            kind="player"
            option={decks.player}
          />
          <Pile
            label={tr("pile.discard")}
            id="discard"
            count={me.discard.length}
            top={me.discard.at(-1) ?? null}
            faceUp
            kind="player"
          />
        </>
      )}
    </div>
  );
}
