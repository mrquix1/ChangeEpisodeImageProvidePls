/// <reference path="./core.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./plugin.d.ts" />

const TMDB_API_KEY = "{{apiKey}}"
const TMDB_API_BASE = "https://api.themoviedb.org/3"

interface CachedEpisodeImage {
    seasonNumber: number
    episodeNumber: number
    imageUrl: string
    cachedAt: number
}

interface CachedAnime {
    tmdbId: number
    episodes: CachedEpisodeImage[]
    cachedAt: number
}

function init() {
    console.log("[TMDb Episode Provider] Plugin initializing...")

    // Define shared utilities
    $shared.define("tmdbApi", () => {
        return {
            async searchAnime(query: string): Promise<any[]> {
                try {
                    const res = await fetch(
                        `${TMDB_API_BASE}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`
                    )
                    if (!res.ok) {
                        throw new Error(`TMDb API error: ${res.statusText}`)
                    }
                    const data = await res.json() as any
                    return data.results || []
                } catch (error) {
                    console.error("[TMDb Episode Provider] Search error:", error)
                    return []
                }
            },

            async getSeasonEpisodes(tmdbId: number, seasonNumber: number): Promise<any[]> {
                try {
                    const res = await fetch(
                        `${TMDB_API_BASE}/tv/${tmdbId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}`
                    )
                    if (!res.ok) {
                        throw new Error(`TMDb API error: ${res.statusText}`)
                    }
                    const data = await res.json() as any
                    return data.episodes || []
                } catch (error) {
                    console.error("[TMDb Episode Provider] Get season episodes error:", error)
                    return []
                }
            },

            async getTvShow(tmdbId: number): Promise<any | null> {
                try {
                    const res = await fetch(
                        `${TMDB_API_BASE}/tv/${tmdbId}?api_key=${TMDB_API_KEY}`
                    )
                    if (!res.ok) {
                        throw new Error(`TMDb API error: ${res.statusText}`)
                    }
                    return await res.json()
                } catch (error) {
                    console.error("[TMDb Episode Provider] Get TV show error:", error)
                    return null
                }
            },

            getImageUrl(path: string): string {
                if (!path) return ""
                return `https://image.tmdb.org/t/p/original${path}`
            }
        }
    })

    // Hook into anime details request to replace episode images
    $app.onGetAnimeDetails((e) => {
        if (!e.anime || !e.anime.episodes) {
            e.next()
            return
        }

        // Store the current task in cache to avoid race conditions
        const cacheKey = `tmdb-replace-${e.anime.id}`

        // Run the replacement asynchronously
        ;(async () => {
            try {
                await replaceEpisodeImages(e.anime)
            } catch (error) {
                console.error("[TMDb Episode Provider] Error replacing images:", error)
            }
        })()

        e.next()
    })

    async function replaceEpisodeImages(anime: any) {
        if (!anime || !anime.episodes || anime.episodes.length === 0) {
            return
        }

        const tmdbApi = $shared.use("tmdbApi")
        const cacheKey = `tmdb-anime-${anime.id}`

        // Check cache first
        const cachedData = $store.get<CachedAnime>(cacheKey)
        let tmdbId: number | null = null
        let episodeMap: Map<string, string> = new Map()

        if (cachedData && Date.now() - cachedData.cachedAt < 86400000) { // 24 hour cache
            tmdbId = cachedData.tmdbId
            for (const episode of cachedData.episodes) {
                episodeMap.set(
                    `${episode.seasonNumber}-${episode.episodeNumber}`,
                    episode.imageUrl
                )
            }
        } else {
            // Search for the anime on TMDb
            tmdbId = await findTmdbAnimeId(anime, tmdbApi)

            if (!tmdbId) {
                console.warn(`[TMDb Episode Provider] Could not find TMDb match for ${anime.title?.english || anime.title?.romaji}`)
                return
            }

            // Fetch all episodes from TMDb
            episodeMap = await fetchAllEpisodeImages(tmdbId, tmdbApi)

            // Cache the result
            $store.set(cacheKey, {
                tmdbId,
                episodes: Array.from(episodeMap.entries()).map(([key, imageUrl]) => {
                    const [season, episode] = key.split("-").map(Number)
                    return { seasonNumber: season, episodeNumber: episode, imageUrl }
                }),
                cachedAt: Date.now()
            })
        }

        // Replace episode images
        if (anime.episodes && Array.isArray(anime.episodes)) {
            for (const episode of anime.episodes) {
                if (episode && episode.seasonNumber !== undefined && episode.episodeNumber !== undefined) {
                    const key = `${episode.seasonNumber}-${episode.episodeNumber}`
                    const tmdbImageUrl = episodeMap.get(key)

                    if (tmdbImageUrl && episode.image) {
                        console.log(`[TMDb Episode Provider] Replacing image for S${episode.seasonNumber}E${episode.episodeNumber}`)
                        episode.image = tmdbImageUrl
                    }
                }
            }
        }

        console.log(`[TMDb Episode Provider] Replaced images for ${anime.title?.english || anime.title?.romaji}`)
    }

    async function findTmdbAnimeId(anime: any, tmdbApi: any): Promise<number | null> {
        // Try different search queries
        const queries = [
            anime.title?.english,
            anime.title?.romaji,
            ...(anime.synonyms || []).slice(0, 2)
        ].filter(Boolean)

        for (const query of queries) {
            const results = await tmdbApi.searchAnime(query)

            if (results.length > 0) {
                // Use the first result (usually the most relevant)
                const result = results[0]
                console.log(`[TMDb Episode Provider] Found TMDb match: ${result.name} (ID: ${result.id})`)
                return result.id
            }
        }

        return null
    }

    async function fetchAllEpisodeImages(tmdbId: number, tmdbApi: any): Promise<Map<string, string>> {
        const episodes = new Map<string, string>()

        try {
            // Get TV show info to know how many seasons exist
            const tvShow = await tmdbApi.getTvShow(tmdbId)

            if (!tvShow || !tvShow.number_of_seasons) {
                return episodes
            }

            // Fetch each season
            for (let season = 0; season < tvShow.number_of_seasons; season++) {
                const seasonEpisodes = await tmdbApi.getSeasonEpisodes(tmdbId, season)

                for (const ep of seasonEpisodes) {
                    if (ep.still_path) {
                        const key = `${season}-${ep.episode_number}`
                        const imageUrl = tmdbApi.getImageUrl(ep.still_path)
                        episodes.set(key, imageUrl)
                    }
                }

                // Add a small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100))
            }

            console.log(`[TMDb Episode Provider] Fetched ${episodes.size} episode images from TMDb`)
        } catch (error) {
            console.error("[TMDb Episode Provider] Error fetching episode images:", error)
        }

        return episodes
    }

    // Register UI context for settings and logging
    $ui.register((ctx) => {
        console.log("[TMDb Episode Provider] UI context registered")

        const status = ctx.state("Idle")
        const cachedCount = ctx.state(0)

        // Update cached count on load
        const cacheKeys = $store.values().filter((v: any) => v.episodes !== undefined)
        cachedCount.set(cacheKeys.length)

        // Create a tray for plugin status
        const tray = ctx.newTray({
            tooltipText: "TMDb Episode Provider",
            withContent: true,
        })

        tray.render(() => {
            return tray.stack([
                tray.text("TMDb Episode Provider", { className: "font-bold" }),
                tray.text(`Status: ${status.get()}`, { className: "text-sm" }),
                tray.text(`Cached anime: ${cachedCount.get()}`, { className: "text-sm" }),
                tray.button("Clear Cache", {
                    size: "sm",
                    onClick: ctx.eventHandler("clear-cache", () => {
                        // Clear all cached data
                        const allKeys = $store.getAll()
                        for (const key of Object.keys(allKeys)) {
                            if (key.startsWith("tmdb-anime-")) {
                                $store.remove(key)
                            }
                        }
                        cachedCount.set(0)
                        ctx.toast.success("Cache cleared!")
                    }),
                }),
            ])
        })

        console.log("[TMDb Episode Provider] Plugin fully loaded")
    })
}
