import { headers } from "next/headers";
import {
  getIdentity,
  requireIdentity,
  type VerifiedIdentity,
} from "../../cursor/identity";

export async function requireViewer(request: Request) {
  return requireIdentity(request);
}

/** Identity for App Router server components (no Request). */
export async function getPageViewer() {
  return getIdentity(await headers());
}

export function ownerKey(
  identity: VerifiedIdentity | { sub: string },
): string {
  return identity.sub;
}
