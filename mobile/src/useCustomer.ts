import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { apiBase } from "./api";
import type { CustomerData } from "./customerTypes";
const KEY = "elladria.customer.session";
export function useCustomer() {
  const [data, setData] = useState<CustomerData | null>(null),
    [error, setError] = useState(""),
    [ready, setReady] = useState(false);
  const token = useRef<string | null>(null),
    alive = useRef(true),
    generation = useRef(0);
  async function request(route: string, init: RequestInit = {}) {
    if (!apiBase())
      throw new Error(
        "Start the admin server and configure the app connection before signing in.",
      );
    const controller = new AbortController(),
      timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(apiBase() + "/api/customer" + route, {
        ...init,
        credentials: "include",
        signal: controller.signal,
        headers: {
          ...(token.current
            ? { Authorization: "Bearer " + token.current }
            : {}),
          ...init.headers,
        },
      });
      const result = await response.json();
      if (!response.ok)
        throw Object.assign(new Error(result.error || "The request failed."), {
          status: response.status,
        });
      return result;
    } finally {
      clearTimeout(timer);
    }
  }
  async function refresh() {
    const version = generation.current;
    try {
      const result = await request("/me");
      if (alive.current && version === generation.current) {
        generation.current++;
        setData(result);
        setError("");
      }
    } catch (error) {
      if (alive.current && version === generation.current) {
        if ((error as { status?: number }).status === 401) setData(null);
        else
          setError(
            "Unable to sync. Check the connection to your admin server.",
          );
      }
    }
  }
  useEffect(() => {
    alive.current = true;
    void (async () => {
      try {
        if (Platform.OS !== "web")
          token.current = await SecureStore.getItemAsync(KEY);
        await refresh();
      } finally {
        if (alive.current) setReady(true);
      }
    })();
    const timer = setInterval(refresh, 5000);
    return () => {
      alive.current = false;
      clearInterval(timer);
    };
  }, []);
  async function authenticate(
    mode: "register" | "login",
    fields: Record<string, string>,
  ) {
    generation.current++;
    const result = await request("/" + mode, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    if (Platform.OS !== "web") {
      token.current = result.token;
      await SecureStore.setItemAsync(KEY, result.token);
    }
    generation.current++;
    setData(result);
    setError("");
  }
  async function action(route: string, body?: unknown, method = "POST") {
    generation.current++;
    const result = await request(route, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    generation.current++;
    setData(result);
    setError("");
    return result as CustomerData;
  }
  async function upload(
    name: string,
    mime: string,
    body: ArrayBuffer,
    kind: string,
  ) {
    generation.current++;
    const result = await request("/files", {
      method: "POST",
      headers: {
        "Content-Type": mime || "application/octet-stream",
        "X-File-Name": encodeURIComponent(name),
        "X-File-Kind": kind,
      },
      body,
    });
    generation.current++;
    setData(result);
    setError("");
  }
  async function logout() {
    await request("/logout", { method: "POST" });
    generation.current++;
    token.current = null;
    if (Platform.OS !== "web") await SecureStore.deleteItemAsync(KEY);
    setData(null);
    setError("");
  }
  return { data, error, ready, refresh, authenticate, action, upload, logout };
}
export type CustomerClient = ReturnType<typeof useCustomer>;
