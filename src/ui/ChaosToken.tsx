import { FONT_FAMILY, glyphChar } from "./glyphs";

/** layers of the tokens font, bottom to top, with the colours ArkhamCards paints them in */
type Layers = [string, string][];
const NUMBER = (n: string, overlay = "#E6E1D3"): Layers => [
  ["token_symbol_fill", "#394852"],
  ["token_number_overlay", overlay],
  [`token_${n}_highlight`, "#FFFBF2"],
];
const SYMBOL = (name: string, fill: string, fillGlyph = `token_${name}_fill`): Layers => [
  [fillGlyph, fill],
  [`token_${name}_overlay`, "#E6E1D3"],
  [`token_${name}_highlight`, "#FFFBF2"],
];

/** every chaos token the game draws */
export const CHAOS_TOKENS = ["+1", "0", "-1", "-2", "-3", "-4", "-5", "-6", "-7", "-8", "skull", "cultist", "tablet", "elderThing", "elderSign", "autoFail", "bless", "curse", "frost", "blood"];

/** a token's layers, bottom to top: [symbol, colour] */
export function layersFor(token: string): Layers | null {
  if (token === "+1") return NUMBER("1", "#ECBA59");
  if (/^(0|-[1-8])$/.test(token)) return NUMBER(token);
  switch (token) {
    case "skull":
      return SYMBOL("skull", "#552D2D", "token_symbol_fill");
    case "cultist":
      return SYMBOL("cultist", "#314629");
    case "tablet":
      return SYMBOL("tablet", "#294146");
    case "elderThing":
      return SYMBOL("elder_thing", "#442946");
    case "autoFail":
      return [["token_auto_fail_overlay", "#E6E1D3"], ["token_auto_fail_highlight", "#8D181E"]];
    case "elderSign":
      return [["token_elder_sign_overlay", "#E6E1D3"], ["token_elder_sign_fill", "#427DAD"], ["token_elder_sign_highlight", "#E6E1D3"]];
    case "bless":
      return [["token_bless_fill", "#9D702A"], ["token_bless_overlay", "#E6E1D3"]];
    case "curse":
      return [["token_curse_fill", "#35232F"], ["token_curse_overlay", "#E6E1D3"]];
    case "frost":
      return [["token_number_fill", "#3D3A63"], ["token_frost_overlay", "#E6E1D3"], ["token_frost_highlight", "#FFFBF2"]];
    case "blood":
      return [["token_blood_fill", "#C22026"], ["token_blood_overlay", "#353534"], ["token_blood_highlight", "#353534"]];
  }
  return null;
}

/** the token disc's background gradient (ArkhamCards' values) */
const GRADIENT: Record<string, string> = {
  autoFail: "radial-gradient(circle, #8D181E 75%, #6A0B10 100%)",
  elderSign: "radial-gradient(circle, #33A1FB 0%, #3C8AC9 50%, #457398 100%)",
  bless: "radial-gradient(circle, #9C702A 25%, #695823 100%)",
  curse: "radial-gradient(circle, #362330 25%, #3B224A 100%)",
  frost: "radial-gradient(circle, #3D3A63 66%, #495483 100%)",
  blood: "radial-gradient(circle, #343433 75%, #1C1D1C 100%)",
};
const DEFAULT_GRADIENT = "radial-gradient(circle, #FFFBF2 60%, #D6CFB9 100%)";

/** true if the tokens font can draw this token */
export const hasTokenArt = (token: string) => !!layersFor(token)?.every(([g]) => glyphChar(g, "tokens"));

/**
 * A chaos token drawn from the tokens font's layered glyphs. If the font can't load, CSS swaps in
 * a plain token face with the token's label (same size, no layout shift).
 */
export function ChaosToken({ token, size = 28, title }: { token: string; size?: number; title?: string }) {
  const label = token.replace("-", "−");
  const layers = layersFor(token);
  const face = (
    <span className={`token-face ${layers ? "font-backed" : ""}`} style={{ width: size, height: size, fontSize: size * 0.38 }} title={title ?? token}>
      {label}
    </span>
  );
  if (!layers || !hasTokenArt(token)) return face;
  return (
    <span className="tok-wrap" style={{ width: size, height: size }} title={title ?? token} role="img" aria-label={title ?? label}>
      <span className="tok-font" style={{ fontSize: size, fontFamily: FONT_FAMILY.tokens, background: GRADIENT[token] ?? DEFAULT_GRADIENT }} aria-hidden="true">
        {layers.map(([g, color]) => (
          <span key={g} style={{ color }}>
            {glyphChar(g, "tokens")}
          </span>
        ))}
      </span>
      {face}
    </span>
  );
}
