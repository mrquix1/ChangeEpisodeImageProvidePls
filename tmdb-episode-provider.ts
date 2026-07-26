/// <reference path="./plugin.d.ts" />
/// <reference path="./system.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./core.d.ts" />

// ⚠️ Replace with your OWN TMDb API key (free, from themoviedb.org/settings/api).
// Do not reuse a key that has ever been pasted into a public repo/chat — rotate it.
//
// NOTE: Seanime runs each hook callback and the UI context in ISOLATED
// runtimes. Top-level consts declared here are NOT visible inside them —
// so every constant below is re-declared inline inside each callback body.

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
            console.error("[TMDb] Hook error:", err)
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
            // TEMP DIAGNOSTIC: log every navigation event, unfiltered,
            // so we can confirm this hook fires at all before trusting
            // anything downstream.
            console.log("[TMDb] onNavigate fired. pathname:", ev.pathname, "searchParams:", JSON.stringify(ev.searchParams))

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

                // 1. Resolve the AniList ID to a TMDb TV show ID.
                const findRes = await ctx.fetch(
                    `${TMDB_BASE}/find/${mediaId}?api_key=${TMDB_API_KEY}&external_source=anilist_id`
                )
                const findData = findRes.json()

                if (!findData?.tv_results?.length) {
                    console.log("[TMDb] No TMDb match for AniList ID", mediaId)
                    return
                }

                const tmdbId = findData.tv_results[0].id

                // 2. Get the list of seasons for the show.
                const showRes = await ctx.fetch(`${TMDB_BASE}/tv/${tmdbId}?api_key=${TMDB_API_KEY}`)
                const showData = showRes.json()

                if (!showData?.seasons?.length) {
                    console.log("[TMDb] No seasons found for TMDb ID", tmdbId)
                    return
                }

                // 3. Walk every season and build an ABSOLUTE episode number ->
                //    still image map. AniList/Seanime typically number episodes
                //    continuously across seasons (e.g. S3E1 = episode 14 overall),
                //    while TMDb resets per season, so we re-number here.
                //    NOTE: this assumption may need adjusting per-show — some
                //    entries on AniList are split by season instead.
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

                if (Object.keys(episodeImages).length === 0) {
                    console.log("[TMDb] No episode stills found for", mediaId)
                    return
                }

                // 4. Persist so the hook runtime can read it.
                const all = ($storage.get(STORAGE_KEY) as StoredData) || {}
                all[mediaId] = episodeImages
                $storage.set(STORAGE_KEY, all)

                console.log(
                    "[TMDb] Cached",
                    Object.keys(episodeImages).length,
                    "episode images for media",
                    mediaId
                )

                // 5. Force Seanime to drop its cached metadata and refetch.
                ctx.anime.clearEpisodeMetadataCache()
                $app.invalidateClientQuery([
                    "ANIME-ENTRIES-get-anime-entry",
                    "ANIME-get-anime-episode-collection",
                ])

                ctx.toast.success("TMDb episode images loaded — reload the page if they don't appear yet.")
            } catch (err) {
                console.error("[TMDb] Fetch error:", err)
                ctx.toast.error("Failed to fetch TMDb episode images.")
            }
        }, [currentMediaId])
    })
}
