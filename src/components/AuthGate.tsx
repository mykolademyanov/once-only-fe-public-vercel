"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiKey } from "@/lib/auth";
import PageSpinner from "./PageSpinner";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const key = getApiKey();
    if (!key) router.replace("/login");
    else setReady(true);
  }, [router]);

  if (!ready) return <PageSpinner fullScreen label="Loading dashboard..." />;
  return <>{children}</>;
}
