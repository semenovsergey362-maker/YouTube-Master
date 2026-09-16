import { safeStorage } from "../lib/storage";

export interface YouTubePlaylistDetails {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  itemCount: number;
  privacyStatus?: string;
  publishedAt?: string;
}

/**
 * Fetches playlists directly from YouTube API endpoint (/api/youtube/playlists).
 */
export async function fetchYouTubePlaylists(): Promise<{
  playlists: YouTubePlaylistDetails[];
  isDemo: boolean;
}> {
  try {
    const res = await fetch("/api/youtube/playlists");
    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status}`);
    }
    const data = await res.json();
    return {
      playlists: Array.isArray(data.playlists) ? data.playlists : [],
      isDemo: Boolean(data.isDemo)
    };
  } catch (err) {
    console.warn("Error fetching YouTube playlists:", err);
    return { playlists: [], isDemo: true };
  }
}

/**
 * Synchronizes local idea playlists with YouTube channel playlists.
 * Merges unique titles from YouTube into the existing local idea playlists list.
 */
export async function syncPlaylistsWithYouTube(
  existingPlaylists: string[] = []
): Promise<{
  mergedPlaylists: string[];
  addedCount: number;
  totalCount: number;
  isDemo: boolean;
}> {
  const { playlists: ytPlaylists, isDemo } = await fetchYouTubePlaylists();

  const formattedExisting = new Set(existingPlaylists.map(p => p.toLowerCase().trim()));
  const merged = [...existingPlaylists];
  let addedCount = 0;

  for (const yt of ytPlaylists) {
    if (!yt.title) continue;
    const cleanTitle = yt.title.trim();
    // Add emoji prefix if missing to align with app style
    const formattedTitle = cleanTitle.match(/^[\p{Emoji}\u2000-\u3300]/u)
      ? cleanTitle
      : `🎬 ${cleanTitle}`;

    const lowKey = formattedTitle.toLowerCase().trim();
    const rawLowKey = cleanTitle.toLowerCase().trim();

    if (!formattedExisting.has(lowKey) && !formattedExisting.has(rawLowKey)) {
      merged.push(formattedTitle);
      formattedExisting.add(lowKey);
      formattedExisting.add(rawLowKey);
      addedCount++;
    }
  }

  // Persist updated list to local storage
  try {
    safeStorage.setItem("yt_idea_playlists", JSON.stringify(merged));
  } catch (e) {
    console.error("Failed to save synced playlists to localStorage", e);
  }

  return {
    mergedPlaylists: merged,
    addedCount,
    totalCount: merged.length,
    isDemo
  };
}

/**
 * Creates a new playlist on YouTube via backend proxy (/api/youtube/create-playlist).
 */
export async function createPlaylistOnYouTube(
  title: string,
  description?: string
): Promise<{ playlist: YouTubePlaylistDetails; isDemo: boolean }> {
  const res = await fetch("/api/youtube/create-playlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title,
      description: description || "Создано в AI Studio для YouTube идей",
      privacyStatus: "public"
    })
  });

  if (!res.ok) {
    throw new Error("Не удалось создать плейлист на YouTube");
  }

  const data = await res.json();
  return {
    playlist: data.playlist,
    isDemo: Boolean(data.isDemo)
  };
}
