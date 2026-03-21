import { fetch } from "expo/fetch";
import { authClient } from "../auth/auth-client";

// Response envelope type - all app routes return { data: T }
interface ApiResponse<T> {
  data: T;
}

const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;

const request = async <T>(
  url: string,
  options: { method?: string; body?: string } = {}
): Promise<T> => {
  const headers: Record<string, string> = {};
  if (options.body) {
    headers["Content-Type"] = "application/json";
  }
  // Attach auth cookie for authenticated requests
  const cookie = authClient.getCookie();
  if (cookie) {
    headers["Cookie"] = cookie;
  }

  const response = await fetch(`${baseUrl}${url}`, {
    ...options,
    credentials: "include",
    headers,
  });

  // 1. Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  // 2. JSON responses: parse and unwrap { data }
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    const json = await response.json() as any;
    if (!response.ok) {
      const message = json?.error?.message ?? `Request failed with status ${response.status}`;
      throw new Error(message);
    }
    return (json as ApiResponse<T>).data;
  }

  // 3. Non-JSON: throw on error status
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return undefined as T;
};

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body: any) =>
    request<T>(url, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(url: string, body: any) =>
    request<T>(url, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(url: string) => request<T>(url, { method: "DELETE" }),
  patch: <T>(url: string, body: any) =>
    request<T>(url, { method: "PATCH", body: JSON.stringify(body) }),
};
