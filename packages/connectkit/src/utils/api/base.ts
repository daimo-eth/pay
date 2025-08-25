import { useCallback, useEffect, useMemo, useState } from "react";
import { ROZO_API_TOKEN, ROZO_API_URL } from "../../constants/rozoConfig";

// HTTP methods type
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

// Request options type
export interface RequestOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, string>;
  signal?: AbortSignal;
}

// Response type with generic data
export interface ApiResponse<T = any> {
  data: T | null;
  error: Error | null;
  status: number | null;
}

// Request state for hooks
export interface RequestState<T = any> extends ApiResponse<T> {
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
}

/**
 * Creates a URL with query parameters
 * @param url - Base URL
 * @param params - Query parameters
 * @returns Full URL with query parameters
 */
const createUrl = (url: string, params?: Record<string, string>): string => {
  const fullUrl = url.startsWith("/")
    ? `${ROZO_API_URL}${url}`
    : `${ROZO_API_URL}/${url}`;

  if (!params) return fullUrl;

  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(key, value);
    }
  });

  const queryString = queryParams.toString();
  return queryString ? `${fullUrl}?${queryString}` : fullUrl;
};

/**
 * Core fetch function for making API requests
 * @param url - API endpoint path
 * @param options - Request options
 * @returns Promise with response data
 */
export const fetchApi = async <T = any>(
  url: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> => {
  const { method = "GET", headers = {}, body, params, signal } = options;

  try {
    const fullUrl = createUrl(url, params);

    const requestHeaders: HeadersInit = {
      "Content-Type": "application/json",
      ...headers,
      Authorization: `Bearer ${ROZO_API_TOKEN}`,
    };

    const requestOptions: RequestInit = {
      method,
      headers: requestHeaders,
      signal,
    };

    if (body && method !== "GET") {
      requestOptions.body = JSON.stringify(body);
    }

    const response = await fetch(fullUrl, requestOptions);
    const status = response.status;

    // Handle non-JSON responses
    const contentType = response.headers.get("content-type");
    let data: T | null = null;

    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else if (contentType && contentType.includes("text/")) {
      data = (await response.text()) as unknown as T;
    }

    if (!response.ok) {
      throw new Error(data ? JSON.stringify(data) : response.statusText);
    }

    return { data, error: null, status };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
      status: null,
    };
  }
};

/**
 * API client with methods for different HTTP verbs
 */
export const apiClient = {
  /**
   * GET request
   * @param url - API endpoint path
   * @param options - Request options
   * @returns Promise with response data
   */
  get: <T = any>(
    url: string,
    options: Omit<RequestOptions, "method" | "body"> = {}
  ) => fetchApi<T>(url, { ...options, method: "GET" }),

  /**
   * POST request
   * @param url - API endpoint path
   * @param body - Request body
   * @param options - Additional request options
   * @returns Promise with response data
   */
  post: <T = any>(
    url: string,
    body: any,
    options: Omit<RequestOptions, "method" | "body"> = {}
  ) => fetchApi<T>(url, { ...options, method: "POST", body }),

  /**
   * PUT request
   * @param url - API endpoint path
   * @param body - Request body
   * @param options - Additional request options
   * @returns Promise with response data
   */
  put: <T = any>(
    url: string,
    body: any,
    options: Omit<RequestOptions, "method" | "body"> = {}
  ) => fetchApi<T>(url, { ...options, method: "PUT", body }),

  /**
   * PATCH request
   * @param url - API endpoint path
   * @param body - Request body
   * @param options - Additional request options
   * @returns Promise with response data
   */
  patch: <T = any>(
    url: string,
    body: any,
    options: Omit<RequestOptions, "method" | "body"> = {}
  ) => fetchApi<T>(url, { ...options, method: "PATCH", body }),

  /**
   * DELETE request
   * @param url - API endpoint path
   * @param options - Request options
   * @returns Promise with response data
   */
  delete: <T = any>(
    url: string,
    options: Omit<RequestOptions, "method"> = {}
  ) => fetchApi<T>(url, { ...options, method: "DELETE" }),
};

/**
 * React hook for making API requests
 * @param url - API endpoint path
 * @param options - Request options
 * @param dependencies - Dependencies array to trigger request
 * @returns Request state and refetch function
 */
export const useApiRequest = <T = any>(
  url: string,
  options: RequestOptions = {},
  dependencies: any[] = []
): [RequestState<T>, (newOptions?: RequestOptions) => Promise<void>] => {
  // Create stable options object that only changes when content actually changes
  const stableOptions = useMemo(() => {
    const { method, headers, body, params, signal } = options;

    // Sort headers and params for consistent comparison
    const sortedHeaders = headers
      ? Object.fromEntries(
          Object.entries(headers).sort(([a], [b]) => a.localeCompare(b))
        )
      : undefined;
    const sortedParams = params
      ? Object.fromEntries(
          Object.entries(params).sort(([a], [b]) => a.localeCompare(b))
        )
      : undefined;

    return {
      method,
      headers: sortedHeaders,
      body,
      params: sortedParams,
      signal,
    };
  }, [
    options.method,
    options.headers,
    options.body,
    options.params,
    options.signal,
  ]);

  const [state, setState] = useState<RequestState<T>>({
    data: null,
    error: null,
    status: null,
    isLoading: true,
    isError: false,
    isSuccess: false,
  });

  const fetchData = useCallback(
    async (newOptions?: RequestOptions) => {
      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        const mergedOptions = { ...stableOptions, ...newOptions };
        const response = await fetchApi<T>(url, mergedOptions);

        setState({
          data: response.data,
          error: response.error,
          status: response.status,
          isLoading: false,
          isError: !!response.error,
          isSuccess: !response.error && !!response.data,
        });
      } catch (error) {
        setState({
          data: null,
          error: error instanceof Error ? error : new Error(String(error)),
          status: null,
          isLoading: false,
          isError: true,
          isSuccess: false,
        });
      }
    },
    [url, stableOptions]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchData({ ...options, signal: controller.signal });

    return () => {
      controller.abort();
    };
  }, [fetchData, ...dependencies]);

  return [state, fetchData];
};
