import play, { SpotifyTrack, SpotifyAlbum, SpotifyPlaylist } from "play-dl";
import { Track } from "../../types";
import { logger } from "../../utils/logger";

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

async function resolveYouTubeUrl(url: string, requestedBy: string): Promise<Track[]> {
  const info = await play.video_info(url);
  const details = info.video_details;

  return [{
    title: details.title ?? "Desconhecido",
    url: details.url,
    duration: formatDuration(details.durationInSec),
    requestedBy,
  }];
}

async function resolveYouTubeSearch(query: string, requestedBy: string): Promise<Track[]> {
  const results = await play.search(query, { limit: 1, source: { youtube: "video" } });
  if (results.length === 0) return [];

  const video = results[0];
  return [{
    title: video.title ?? "Desconhecido",
    url: video.url,
    duration: formatDuration(video.durationInSec),
    requestedBy,
  }];
}

async function resolveSpotifyTrack(track: SpotifyTrack, requestedBy: string): Promise<Track | null> {
  const searchQuery = `${track.name} ${track.artists.map(a => a.name).join(" ")}`;
  const results = await play.search(searchQuery, { limit: 1, source: { youtube: "video" } });
  if (results.length === 0) return null;

  const video = results[0];
  return {
    title: track.name,
    url: video.url,
    duration: formatDuration(video.durationInSec),
    requestedBy,
  };
}

async function resolveSpotifyUrl(url: string, requestedBy: string): Promise<Track[]> {
  const spotifyData = await play.spotify(url);

  if (spotifyData.type === "track") {
    const track = await resolveSpotifyTrack(spotifyData as SpotifyTrack, requestedBy);
    return track ? [track] : [];
  }

  if (spotifyData.type === "album" || spotifyData.type === "playlist") {
    const collection = spotifyData as SpotifyAlbum | SpotifyPlaylist;
    const page = await collection.all_tracks();
    const tracks: Track[] = [];

    for (const spotTrack of page.slice(0, 50)) {
      try {
        const resolved = await resolveSpotifyTrack(spotTrack, requestedBy);
        if (resolved) tracks.push(resolved);
      } catch (error) {
        logger.warn(`Não conseguiu resolver track do Spotify: ${spotTrack.name}`, error);
      }
    }

    return tracks;
  }

  return [];
}

export async function resolveTracks(input: string, requestedBy: string): Promise<Track[]> {
  const urlType = await play.validate(input);

  if (urlType === "yt_video") {
    return resolveYouTubeUrl(input, requestedBy);
  }

  if (urlType === "sp_track" || urlType === "sp_album" || urlType === "sp_playlist") {
    return resolveSpotifyUrl(input, requestedBy);
  }

  if (urlType === "yt_playlist") {
    const playlist = await play.playlist_info(input, { incomplete: true });
    const videos = await playlist.all_videos();
    return videos.slice(0, 50).map(v => ({
      title: v.title ?? "Desconhecido",
      url: v.url,
      duration: formatDuration(v.durationInSec),
      requestedBy,
    }));
  }

  return resolveYouTubeSearch(input, requestedBy);
}
