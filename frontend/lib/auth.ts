import { authAPI } from "./api";
import type { User } from "@/types";

export function saveTokens(access: string, refresh: string) {
  localStorage.setItem("access_token", access);
  localStorage.setItem("refresh_token", refresh);
}

export function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export function isLoggedIn(): boolean {
  return !!getAccessToken();
}

export async function login(email: string, password: string): Promise<User> {
  const { data } = await authAPI.login(email, password);
  saveTokens(data.access_token, data.refresh_token);
  return data.user;
}

export async function register(email: string, password: string, full_name?: string): Promise<User> {
  const { data } = await authAPI.register(email, password, full_name);
  saveTokens(data.access_token, data.refresh_token);
  return data.user;
}

export function logout() {
  clearTokens();
  window.location.href = "/";
}
