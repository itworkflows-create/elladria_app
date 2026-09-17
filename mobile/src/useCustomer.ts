import { cloudEnabled, supabase, watchSupabaseAppState } from "./supabase";
import { cloudCustomerRequest, cloudAuthenticate, cloudCustomerData } from "./cloudApi";
﻿import { useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
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
    generation = useRef(0),
    accountId = useRef<string | null>(null),
    refreshing = useRef(false),
    mutations = useRef(0);
  async function request(route: string, init: RequestInit = {}) {
    if (cloudEnabled) return cloudCustomerRequest(route, init);
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
    if (refreshing.current || mutations.current > 0) return;
    refreshing.current = true;
    const version = generation.current;
    try {
      const result = await request("/me");
      if (alive.current && version === generation.current) {
        setData(result);
        setError("");
      }
    } catch (error) {
      if (alive.current && version === generation.current) {
        if ((error as { status?: number }).status === 401) setData(null);
        else
          setError(
            (error as Error).message || "Unable to sync. Check your connection.",
          );
      }
    } finally {
      refreshing.current = false;
      if (alive.current && version === generation.current) setReady(true);
      else if (alive.current && mutations.current === 0)
        setTimeout(() => { if (alive.current) void refresh(); }, 0);
    }
  }
  useEffect(() => {
    alive.current = true;
    void (async () => {
      try {
        if (!cloudEnabled && Platform.OS !== "web")
          token.current = await SecureStore.getItemAsync(KEY);
        await refresh();
      } catch (error) {
        if (alive.current) {
          setError((error as Error).message || "Unable to restore your session.");
          setReady(true);
        }
      }
    })();
    const stopAppState = cloudEnabled ? watchSupabaseAppState() : () => {};
    const authSubscription = cloudEnabled ? supabase?.auth.onAuthStateChange((_event, session) => {
      if (!alive.current) return;
      const nextId = session?.user.id ?? null;
      if (accountId.current !== nextId) {
        accountId.current = nextId;
        generation.current++;
        setData(null);
        setError("");
      }
      if (session) setTimeout(() => { if (alive.current) void refresh(); }, 0);
    }).data.subscription : undefined;
    const timer = setInterval(() => {
      if (Platform.OS === "web" || AppState.currentState === "active") void refresh();
    }, 5000);
    const foreground = AppState.addEventListener("change", state => {
      if (state === "active") void refresh();
    });
    return () => {
      alive.current = false;
      stopAppState();
      authSubscription?.unsubscribe();
      foreground.remove();
      clearInterval(timer);
    };
  }, []);
  async function authenticate(
    mode: "register" | "login",
    fields: Record<string, string>,
  ) {
    generation.current++;
    if (cloudEnabled) {
      const signedIn = await cloudAuthenticate(mode, fields);
      if (!signedIn) return false;
      const value = await cloudCustomerData();
      generation.current++;
      setData(value);
      setError("");
      return true;
    }
    const result = await request("/" + mode, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    if (!cloudEnabled && Platform.OS !== "web") {
      token.current = result.token;
      await SecureStore.setItemAsync(KEY, result.token);
    }
    generation.current++;
    setData(result);
    setError("");
    return true;
  }
  async function action(route: string, body?: unknown, method = "POST") {
    const version = ++generation.current;
    mutations.current++;
    try {
    const result = await request(route, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (alive.current && version === generation.current) {
      setData(result);
      setError("");
    }
    return result as CustomerData;
    } finally {
      mutations.current--;
    }
  }
  async function upload(
    name: string,
    mime: string,
    body: ArrayBuffer,
    kind: string,
  ) {
    const version = ++generation.current;
    mutations.current++;
    try {
    const result = await request("/files", {
      method: "POST",
      headers: {
        "Content-Type": mime || "application/octet-stream",
        "X-File-Name": encodeURIComponent(name),
        "X-File-Kind": kind,
      },
      body,
    });
    if (alive.current && version === generation.current) {
      setData(result);
      setError("");
    }
    } finally {
      mutations.current--;
    }
  }
  async function logout() {
    await request("/logout", { method: "POST" });
    generation.current++;
    token.current = null;
    if (!cloudEnabled && Platform.OS !== "web") await SecureStore.deleteItemAsync(KEY);
    setData(null);
    setError("");
  }
  return { data, error, ready, refresh, authenticate, action, upload, logout };
}
export type CustomerClient = ReturnType<typeof useCustomer>;
