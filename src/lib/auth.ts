import { requireIdentity } from "../../cursor/identity";

export async function requireViewer(request: Request) {
  return requireIdentity(request);
}
