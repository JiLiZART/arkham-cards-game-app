import { t } from "../../../content/i18n";
import { db, gameStore, useGame } from "../../state/context";

const tr = (key: string, vars?: Record<string, string | number>) =>
  t(db, gameStore.getState().locale, key, vars);

/** the five-part summary for reading before the first game: the same plain words as the tips */
export function HowTo() {
  useGame((s) => s.locale);
  return (
    <div className="screen howto">
      <h1>{tr("howto.title")}</h1>
      {(["goal", "round", "turn", "tests", "enemies"] as const).map((part, k) => (
        <section key={part}>
          <h2>
            {k + 1}. {tr(`howto.${part}.title`)}
          </h2>
          <p>{tr(`howto.${part}.text`)}</p>
        </section>
      ))}
      <button className="primary" onClick={() => gameStore.setState({ screen: "title" })}>
        {tr("howto.back")}
      </button>
    </div>
  );
}
