import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { API_BASE_URL } from './api-config';

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      // Clone the response before trying to read it as JSON to avoid the "body stream already read" error
      const clonedRes = res.clone();
      const errorData = await clonedRes.json();
      const errorMessage = errorData.error || res.statusText;
      throw new Error(`${res.status}: ${errorMessage}`);
    } catch (jsonError) {
      // If parsing fails, use text instead
      const text = await res.text() || res.statusText;
      throw new Error(`${res.status}: ${text}`);
    }
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Prepend API_BASE_URL to the URL if it's not an absolute URL
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  
  const res = await fetch(fullUrl, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const queryKeyStr = queryKey[0] as string;
    // Prepend API_BASE_URL to the URL if it's not an absolute URL
    const fullUrl = queryKeyStr.startsWith('http') ? queryKeyStr : `${API_BASE_URL}${queryKeyStr}`;
    
    const res = await fetch(fullUrl, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
