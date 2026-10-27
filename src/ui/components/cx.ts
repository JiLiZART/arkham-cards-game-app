/** class names joined with spaces, leaving out the parts that are off: `cx(styles.card, legal && styles.legal)` */
export const cx = (...parts: (string | false | null | undefined)[]): string =>
  parts.filter(Boolean).join(" ");
