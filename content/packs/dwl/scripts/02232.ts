// Alyssa Graham — look at the top card of the encounter deck or any player deck; 1 doom on her puts it on the bottom
// (her +1 intellect and the exhaust ability are in cards.json)
import {
  activeInvs,
  asString,
  type CardScript,
  card,
  type GameContext,
  inv,
  invName,
  moveCard,
  pile,
  placeDoom,
  queue,
  runScript,
  type ScriptRun,
  ZONE,
} from "../../../../src/engine/api";

const ENCOUNTER = "encounter";
const topOf = (game: GameContext, deck: string) =>
  deck === ENCOUNTER ? pile(game, ZONE.EncounterDeck)[0] : inv(game, deck).deck[0];

export default {
  fns: {
    look(game: GameContext, run: ScriptRun) {
      const decks = [
        ...(pile(game, ZONE.EncounterDeck).length
          ? [
              {
                id: ENCOUNTER,
                label: "Encounter deck",
                value: ENCOUNTER,
                key: "option.encounterDeck",
              },
            ]
          : []),
        ...activeInvs(game)
          .filter((i) => inv(game, i).deck.length)
          .map((i) => ({
            id: i,
            label: `${invName(game, i)}'s deck`,
            value: i,
            key: "option.deckOf",
            vars: { code: i },
          })),
      ];
      if (!decks.length) return;
      const deck = run.choose<string>(decks, {
        text: "Choose a deck to look at",
        key: "chooseDeck",
      });
      queue(game, runScript({ code: "02232", fn: "bottom", ctx: run.ctx, args: deck }));
    },
    /** the looked-at card stays, or goes to the bottom for 1 doom on Alyssa */
    bottom(game: GameContext, run: ScriptRun) {
      const deck = asString(run.args);
      const top = deck ? topOf(game, deck) : undefined;
      if (!deck || !top) return;
      const under = run.choose<boolean>(
        [
          { id: "keep", label: "Leave it on top", value: false, key: "option.leaveOnTop" },
          {
            id: "bottom",
            label: "Add 1 doom to Alyssa Graham: put it on the bottom",
            value: true,
            key: "option.alyssaBottom",
          },
        ],
        { text: "Alyssa Graham: the top card of the deck", key: "alyssaGraham" },
        { auto: false, shown: [top] },
      );
      if (!under) return;
      moveCard(game, top, deck === ENCOUNTER ? ZONE.EncounterDeck : ZONE.Deck, {
        inv: deck === ENCOUNTER ? null : deck,
      });
      if (card(game, run.source)) queue(game, placeDoom({ card: run.source, n: 1 }));
    },
  },
} satisfies CardScript;
