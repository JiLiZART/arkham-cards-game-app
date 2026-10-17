import { cardText, scenarioText, t } from "../../content/i18n";
import { db, gameStore, useGame } from "../context";
import { Portrait } from "../Portrait";
import { ribbonModel } from "../ribbon";

const tr = (key: string, vars?: Record<string, string | number>) => t(db, gameStore.getState().locale, key, vars);

/** where the game is: scenario and round, the round's four phases, and in the investigation phase whose turn it is with the actions left */
export function Ribbon() {
  const game = useGame((s) => s.game)!;
  const locale = useGame((s) => s.locale);
  const m = ribbonModel(game);
  const turns = (
    <span className="ribbon-turns">
      {m.turns.map((tu) => {
        const name = cardText(db, tu.inv, locale).name;
        const tip = tu.state === "active" ? tr("ribbon.actions", { name, n: tu.filled }) : tu.state === "done" ? tr("ribbon.turnDone", { name }) : name;
        return (
          <span key={tu.inv} className={`ribbon-turn ${tu.state}`} title={tip} aria-label={tip}>
            <Portrait code={tu.inv} size={32} active={tu.state === "active"} title={tip} />
            {tu.pips > 0 && (
              <span className="pips">
                {Array.from({ length: tu.pips }, (_, k) => (
                  <i key={k} className={`pip ${k < tu.filled ? "filled" : ""}`} />
                ))}
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
  return (
    <div className="ribbon">
      <span className="ribbon-scen">
        <b>{scenarioText(db, game.scenarioId, locale).name}</b>
        <span className="ribbon-round">{tr("phase.round", { n: m.round })}</span>
      </span>
      {m.stage !== "play" ? (
        <span className="ribbon-phase current">{tr(m.stage === "setup" ? "phase.setup" : "phase.ended")}</span>
      ) : (
        m.phases.map((p) => {
          const name = tr(`phase.${p.id}`);
          return (
            <span key={p.id} className="ribbon-seg">
              <span className={`ribbon-phase ${p.state}`} title={p.state === "skipped" ? tr("ribbon.skipped", { phase: name }) : name}>
                <span className="full">{name}</span>
                <span className="short">{name[0]}</span>
              </span>
              {p.id === "investigation" && turns}
            </span>
          );
        })
      )}
    </div>
  );
}
