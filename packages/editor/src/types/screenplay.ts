export const SCREENPLAY_NODES = [
  "sceneHeading",
  "action",
  "character",
  "dialogue",
  "parenthetical",
  "transition",
  "shot",
] as const;

export type ScreenplayNodeType = (typeof SCREENPLAY_NODES)[number];

/** Tab cycle order */
export const TAB_CYCLE: ScreenplayNodeType[] = [
  "action",
  "sceneHeading",
  "character",
  "dialogue",
  "parenthetical",
  "transition",
  "shot",
];

/** What Enter creates after each node type */
export const ENTER_TRANSITIONS: Record<ScreenplayNodeType, ScreenplayNodeType> =
  {
    sceneHeading: "action",
    action: "action",
    character: "dialogue",
    dialogue: "character",
    parenthetical: "dialogue",
    transition: "action",
    shot: "action",
  };
