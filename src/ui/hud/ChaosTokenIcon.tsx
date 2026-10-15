import { ChaosToken } from "../ChaosToken";

/** a chaos token, drawn from the tokens font (see ChaosToken) */
export function ChaosTokenIcon({ token, size = 28 }: { token: string; size?: number }) {
  return <ChaosToken token={token} size={size} />;
}
