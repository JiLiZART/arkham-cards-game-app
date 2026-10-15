/** the one place that maps game concepts to icon art (public/icons, produced by scripts/extract-assets.sh) */
export const ICON_FILES = {
  willpower: "willpower", intellect: "intellect", combat: "combat", agility: "agility", wild: "wild",
  guardian: "guardian", seeker: "seeker", rogue: "rogue", mystic: "mystic", survivor: "survivor",
  health: "damage", sanity: "horror", damage: "damage", horror: "horror",
  clue: "clue", doom: "doom", resource: "resource",
  skull: "skull", cultist: "cultist", tablet: "tablet", elderThing: "elderThing", elderSign: "elderSign", autoFail: "autoFail",
  "+1": "plus-one", "-1": "minus-one",
  hand: "slot-hand", arcane: "slot-arcane", accessory: "slot-accessory", body: "slot-body", ally: "slot-ally",
} as const;
export type IconName = keyof typeof ICON_FILES;

/** concepts without art: shown as a styled glyph or label */
export const GLYPHS: Record<string, string> = {
  action: "➤", reaction: "↺", fast: "⚡", free: "⚡", actions: "➤", uses: "◆", per_investigator: "/inv",
};

/** readable text used when an icon image can't load */
export const ICON_LABELS: Record<IconName, string> = {
  willpower: "Will", intellect: "Int", combat: "Com", agility: "Agi", wild: "?",
  guardian: "Gua", seeker: "See", rogue: "Rog", mystic: "Mys", survivor: "Sur",
  health: "HP", sanity: "San", damage: "Dmg", horror: "Hor", clue: "Clue", doom: "Doom", resource: "Res",
  skull: "Skull", cultist: "Cult", tablet: "Tab", elderThing: "ElTh", elderSign: "ElSi", autoFail: "Fail",
  "+1": "+1", "-1": "−1", hand: "Hand", arcane: "Arc", accessory: "Acc", body: "Body", ally: "Ally",
};

export const iconUrl = (name: IconName) => `/icons/${ICON_FILES[name]}.png`;
export const isIcon = (name: string): name is IconName => name in ICON_FILES;

/** ArkhamDB markup keys → icon names */
export const MARKUP_ICONS: Record<string, IconName> = {
  willpower: "willpower", intellect: "intellect", combat: "combat", agility: "agility", wild: "wild",
  skull: "skull", cultist: "cultist", tablet: "tablet", elder_thing: "elderThing", elder_sign: "elderSign", auto_fail: "autoFail",
  guardian: "guardian", seeker: "seeker", rogue: "rogue", mystic: "mystic", survivor: "survivor",
};
