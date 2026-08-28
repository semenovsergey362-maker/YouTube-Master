export type YouTubeAuthUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  picture?: string | null;
};

export type YouTubeAuthSession = {
  user: YouTubeAuthUser | null;
};

const request = async <T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> => {
  const response = await fetch(input, {
    credentials: "same-origin",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = typeof payload === "object" && payload && "error" in payload
      ? String((payload as { error?: unknown }).error || response.statusText)
      : response.statusText;
    throw new Error(message || "YouTube OAuth request failed");
  }

  return payload as T;
};

/** Starts the server-side Authorization Code OAuth flow in a popup. */
export const startYouTubeOAuth = async (): Promise<void> => {
  const { url } = await request<{ url: string }>("/api/auth/url");
  if (!url) throw new Error("Google OAuth URL was not returned by the server");

  const width = 600;
  const height = 720;
  const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
  const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);
  const popup = window.open(
    url,
    "youtube-oauth",
    `popup=yes,width=${width},height=${height},left=${left},top=${top}`
  );

  if (!popup) {
    throw new Error("Не удалось открыть окно Google. Разрешите всплывающие окна для сайта.");
  }

  await new Promise<void>((resolve, reject) => {
    let finished = false;
    const timeout = window.setTimeout(() => finish(new Error("Время ожидания авторизации истекло.")), 120000);
    const interval = window.setInterval(async () => {
      if (popup.closed) {
        try {
          const session = await getYouTubeAuthSession();
          if (session.user) finish();
        } catch {
          // The callback may still be completing after the popup closes.
        }
      }
    }, 700);

    const channel = "BroadcastChannel" in window ? new BroadcastChannel("oauth_channel") : null;
    const finish = (error?: Error) => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timeout);
      window.clearInterval(interval);
      window.removeEventListener("message", onMessage);
      window.removeEventListener("storage", onStorage);
      channel?.close();
      try { if (!popup.closed) popup.close(); } catch { /* noop */ }
      error ? reject(error) : resolve();
    };

    const onSuccess = async () => {
      try {
        const session = await getYouTubeAuthSession();
        if (session.user) finish();
      } catch (error) {
        finish(error instanceof Error ? error : new Error("Авторизация не завершена."));
      }
    };
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "OAUTH_AUTH_SUCCESS") void onSuccess();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === "oauth_auth_success") void onSuccess();
    };

    window.addEventListener("message", onMessage);
    window.addEventListener("storage", onStorage);
    channel && (channel.onmessage = (event) => {
      if (event.data?.type === "OAUTH_AUTH_SUCCESS") void onSuccess();
    });
  });
};

export const getYouTubeAuthSession = () =>
  request<YouTubeAuthSession>("/api/auth/me");

export const logoutYouTube = async () => {
  await request<{ success: boolean }>("/api/auth/logout", { method: "POST" });
};
