// chaos token art: the sprite layers each token is drawn from (data, no React: the icon import script reads it too)
import { hasSymbol } from "./icons";

/** the sprite's token layers (from the tokens font), bottom to top, with the colours ArkhamCards paints them in */
export type Layers = [string, string][];
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
export const CHAOS_TOKENS = [
  "+1",
  "0",
  "-1",
  "-2",
  "-3",
  "-4",
  "-5",
  "-6",
  "-7",
  "-8",
  "skull",
  "cultist",
  "tablet",
  "elderThing",
  "elderSign",
  "autoFail",
  "bless",
  "curse",
  "frost",
  "blood",
];

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
      return [
        ["token_auto_fail_overlay", "#E6E1D3"],
        ["token_auto_fail_highlight", "#8D181E"],
      ];
    case "elderSign":
      return [
        ["token_elder_sign_overlay", "#E6E1D3"],
        ["token_elder_sign_fill", "#427DAD"],
        ["token_elder_sign_highlight", "#E6E1D3"],
      ];
    case "bless":
      return [
        ["token_bless_fill", "#9D702A"],
        ["token_bless_overlay", "#E6E1D3"],
      ];
    case "curse":
      return [
        ["token_curse_fill", "#35232F"],
        ["token_curse_overlay", "#E6E1D3"],
      ];
    case "frost":
      return [
        ["token_number_fill", "#3D3A63"],
        ["token_frost_overlay", "#E6E1D3"],
        ["token_frost_highlight", "#FFFBF2"],
      ];
    case "blood":
      return [
        ["token_blood_fill", "#C22026"],
        ["token_blood_overlay", "#353534"],
        ["token_blood_highlight", "#353534"],
      ];
  }
  return null;
}

/** true if the sprite has every layer of this token */
export const hasTokenArt = (token: string) => !!layersFor(token)?.every(([id]) => hasSymbol(id));
