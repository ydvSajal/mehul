"use client";
import { useEffect, useState } from "react";
import { api } from "./api";

export function useApi<T>(path: string) {
  const [state, setState] = useState<{ data: T | null; error: string | null; loading: boolean }>({
    data: null, error: null, loading: true,
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    api<T>(path)
      .then((data) => live && setState({ data, error: null, loading: false }))
      .catch((e) => live && setState((s) => ({ ...s, error: e.message, loading: false })));
    return () => { live = false; };
  }, [path, tick]);

  return { ...state, reload: () => setTick((t) => t + 1) };
}
