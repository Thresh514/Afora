"use client";

import { useEffect, useMemo, useState } from "react";
import { getClerkAvatarUrlsByEmails } from "@/actions/actions";

export function normalizeMemberEmail(email: string) {
  return email.trim().toLowerCase();
}

/** Loads Clerk profile image URLs for the given emails (batched server-side). */
export function useClerkAvatarMap(emails: string[]) {
  const [map, setMap] = useState<Record<string, string>>({});

  const stableKey = useMemo(() => {
    const unique = [
      ...new Set(emails.map(normalizeMemberEmail).filter((e) => e.length > 0)),
    ].sort();
    return unique.join("|");
  }, [emails]);

  useEffect(() => {
    const list = stableKey ? stableKey.split("|").filter((e) => e.length > 0) : [];
    if (list.length === 0) {
      setMap({});
      return;
    }

    let cancelled = false;
    getClerkAvatarUrlsByEmails(list).then((res) => {
      if (!cancelled && res.success) setMap(res.urls);
    });
    return () => {
      cancelled = true;
    };
  }, [stableKey]);

  const getUrl = (email: string) => map[normalizeMemberEmail(email)] || "";

  return { map, getUrl };
}
