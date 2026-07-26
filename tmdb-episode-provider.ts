/// <reference path="./plugin.d.ts" />
/// <reference path="./system.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./core.d.ts" />

// TMDb API key — this key has been shared in chat, treat it as exposed and
// rotate it once things are working (themoviedb.org/settings/api).

type EpisodeImageMap = Record<number, string>
type StoredData = Record<number, EpisodeImageMap>

function init() {
    // ---- HOOK RUNTIME ----
    // This is the *preventable* variant: we can call preventDefault() and
    // return our own overridden episode metadata instead of just observing it.
    $app.onAnimeEpisodeMetadataRequested((e) => {
        const STORAGE_KEY = "TMDB_EPISODE_IMAGES"

        try {
            const stored = ($storage.get(STORAGE_KEY) as StoredData) || {}
            const forAnime = stored[e.mediaId]

            if (forAnime && forAnime[e.episodeNumber]) {
                const image = forAnime[e.episodeNumber]
                const base = e.animeEpisodeMetadata || {}

                e.animeEpisodeMetadata = {
                    ...base,
                    image: image,
                    hasImage: true,
                }
                e.preventDefault()
            }
        } catch (err) {
            // Silently ignore — a broken lookup should never crash playback.
        }

        e.next()
    })

    // ---- UI RUNTIME ----
    // All network requests happen here. Hooks cannot make HTTP requests.
    $ui.register((ctx) => {
        // Declared inside this runtime's own closure — safe to reuse in
        // ctx.effect() below since that's a nested closure, not a
        // separately-isolated runtime.
        const TMDB_API_KEY = "1a1c34ba2f8d63191cd5b163d74d1c52"
        const TMDB_BASE = "https://api.themoviedb.org/3"
        const TMDB_IMG = "https://image.tmdb.org/t/p/original"
        const STORAGE_KEY = "TMDB_EPISODE_IMAGES"

        const currentMediaId = ctx.state<number | null>(null)

        ctx.screen.onNavigate((ev) => {
            if (ev.pathname === "/entry" && ev.searchParams.id) {
                currentMediaId.set(Number(ev.searchParams.id))
            } else {
                currentMediaId.set(null)
            }
        })

        // Fires onNavigate once immediately so this also works if the
        // plugin loads while an entry page is already open.
        ctx.screen.loadCurrent()

        ctx.effect(async () => {
            const mediaId = currentMediaId.get()
            if (!mediaId) return

            try {
                const stored = ($storage.get(STORAGE_KEY) as StoredData) || {}
                if (stored[mediaId]) {
                    // Already cached for this anime, nothing to do.
                    return
                }

                // 1. Resolve a TMDb TV show ID.
                //    a) Check if Seanime's own metadata provider already has
                //       a themoviedbId mapped for this show (best case).
                //    b) Fall back to TMDb's /find with the TVDB ID.
                //    c) Last resort: search TMDb by title.
                let tmdbId: number | null = null

                const meta = await ctx.anime.getAnimeMetadata("anilist", mediaId)
                const mappings = meta?.mappings as any

                if (mappings?.themoviedbId) {
                    tmdbId = Number(mappings.themoviedbId)
                } else if (mappings?.thetvdbId) {
                    const findRes = await ctx.fetch(
                        `${TMDB_BASE}/find/${mappings.thetvdbId}?api_key=${TMDB_API_KEY}&external_source=tvdb_id`
                    )
                    const findData = findRes.json()

                    if (findData?.tv_results?.length) {
                        tmdbId = findData.tv_results[0].id
                    }
                }

                if (!tmdbId) {
                    const entry = await ctx.anime.getAnimeEntry(mediaId)
                    const title =
                        entry?.media?.title?.userPreferred ||
                        entry?.media?.title?.romaji ||
                        entry?.media?.title?.english

                    if (title) {
                        const searchRes = await ctx.fetch(
                            `${TMDB_BASE}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`
                        )
                        const searchData = searchRes.json()

                        if (searchData?.results?.length) {
                            tmdbId = searchData.results[0].id
                        }
                    }
                }

                if (!tmdbId) return

                // 2. Get the list of seasons for the show.
                const showRes = await ctx.fetch(`${TMDB_BASE}/tv/${tmdbId}?api_key=${TMDB_API_KEY}`)
                const showData = showRes.json()

                if (!showData?.seasons?.length) return

                // 3. Walk every season and build an ABSOLUTE episode number ->
                //    still image map. AniList/Seanime typically number episodes
                //    continuously across seasons, while TMDb resets per season.
                const episodeImages: EpisodeImageMap = {}
                let absoluteCounter = 1

                const seasons = showData.seasons
                    .filter((s: any) => s.season_number > 0)
                    .sort((a: any, b: any) => a.season_number - b.season_number)

                for (const season of seasons) {
                    const seasonRes = await ctx.fetch(
                        `${TMDB_BASE}/tv/${tmdbId}/season/${season.season_number}?api_key=${TMDB_API_KEY}`
                    )
                    const seasonData = seasonRes.json()

                    if (!seasonData?.episodes) continue

                    const eps = seasonData.episodes.sort(
                        (a: any, b: any) => a.episode_number - b.episode_number
                    )

                    for (const ep of eps) {
                        if (ep.still_path) {
                            episodeImages[absoluteCounter] = TMDB_IMG + ep.still_path
                        }
                        absoluteCounter++
                    }
                }

                if (Object.keys(episodeImages).length === 0) return

                // 4. Persist so the hook runtime can read it.
                const all = ($storage.get(STORAGE_KEY) as StoredData) || {}
                all[mediaId] = episodeImages
                $storage.set(STORAGE_KEY, all)

                // 5. Force Seanime to drop its cached metadata and refetch.
                ctx.anime.clearEpisodeMetadataCache()
                $app.invalidateClientQuery([
                    "ANIME-ENTRIES-get-anime-entry",
                    "ANIME-get-anime-episode-collection",
                ])

                ctx.toast.success("TMDb episode images loaded — reload the page if they don't appear yet.")
            } catch (err) {
                // Silently ignore — a broken fetch should never crash the app.
            }
        }, [currentMediaId])
    })
}
