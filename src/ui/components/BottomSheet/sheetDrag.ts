/** how far (px) the handle must be dragged down for the sheet to close */
export const CLOSE_DISTANCE = 60;

/** the sheet's offset while the handle is dragged: down with the finger, never above its resting place */
export const dragOffset = (startY: number, y: number): number => Math.max(0, y - startY);

export const closesOnDrag = (offset: number): boolean => offset > CLOSE_DISTANCE;

export const closesOnKey = (key: string): boolean => key === "Escape";
