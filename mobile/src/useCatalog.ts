import { useEffect, useState } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jobs } from "./domain";
import { defaultContent, type Catalog } from "./catalog";
import { loadCatalog } from "./api";
const KEY = "elladria.public-catalog.v1";
export function useCatalog() {
  const [catalog, setCatalog] = useState<Catalog>({
    jobs,
    content: defaultContent,
    revision: 0,
    updatedAt: "",
  });
  const [connection, setConnection] = useState<
    "loading" | "connected" | "offline"
  >("loading");
  useEffect(() => {
    let alive = true,
      busy = false,
      hasFreshData = false;
    let controller: AbortController | undefined;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw || !alive || hasFreshData) return;
        const saved = JSON.parse(raw);
        if (
          Array.isArray(saved.jobs) &&
          saved.content &&
          Number.isInteger(saved.revision)
        )
          setCatalog(saved);
      })
      .catch(() => {});
    async function refresh() {
      if (busy) return;
      busy = true;
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 5000);
      try {
        const data = await loadCatalog(controller.signal);
        if (alive) {
          hasFreshData = true;
          setCatalog(data);
          setConnection("connected");
          await AsyncStorage.setItem(KEY, JSON.stringify(data)).catch(() => {});
        }
      } catch {
        if (alive) setConnection("offline");
      } finally {
        clearTimeout(timeout);
        busy = false;
      }
    }
    void refresh();
    const timer = setInterval(refresh, 5000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => {
      alive = false;
      clearInterval(timer);
      subscription.remove();
      controller?.abort();
    };
  }, []);
  return { catalog, connection };
}
