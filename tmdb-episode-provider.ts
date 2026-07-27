/// <reference path="./core.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./plugin.d.ts" />

const TMDB_API_KEY = "7b7daf721c0b4b5789d993c24402a9dc"
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
    console.log("[TMDb Episode Provider] 🚀 Plugin initializing...")

    // Hook into anime details request to replace episode images
    try {
        $app.onGetAnimeDetails((e) => {
            console.log("[TMDb Episode Provider] onGetAnimeDetails hook called")
            
            if (!e.anime || !e.anime.episodes) {
                console.log("[TMDb Episode Provider] No anime or episodes found")
                e.next()
                return
            }

            console.log(`[TMDb Episode Provider] Processing ${e.anime.title?.english || e.anime.title?.romaji || 'Unknown'} with ${e.anime.episodes.length} episodes`)

            // Run the replacement asynchronously
            ;(async () => {
                try {
                    await replaceEpisodeImages(e.anime)
                } catch (error) {
                    console.error("[TMDb Episode Provider] Error in replacement:", error)
                }
            })()

            e.next()
        })
        console.log("[TMDb Episode Provider] ✅ Hook registered successfully")
    } catch (err) {
        console.error("[TMDb Episode Provider] ❌ Failed to register hook:", err)
    }

    async function replaceEpisodeImages(anime: any) {
        if (!anime || !anime.episodes || anime.episodes.length === 0) {
            console.log("[TMDb Episode Provider] No episodes to process")
            return
        }

        const cacheKey = `tmdb-anime-${anime.id}`
        console.log(`[TMDb Episode Provider] Cache key: ${cacheKey}`)

        // Check cache first
        const cachedData = $store.get<CachedAnime>(cacheKey)
        let tmdbId: number | null = null
        let episodeMap: Map<string, string> = new Map()

        if (cachedData && Date.now() - cachedData.cachedAt < 86400000) { // 24 hour cache
            console.log("[TMDb Episode Provider] ✅ Using cached data")
            tmdbId = cachedData.tmdbId
            for (const episode of cachedData.episodes) {
                episodeMap.set(
                    `${episode.seasonNumber}-${episode.episodeNumber}`,
                    episode.imageUrl
                )
            }
        } else {
            console.log("[TMDb Episode Provider] 🔍 Fetching fresh data from TMDb")
            
            // Search for the anime on TMDb
            tmdbId = await findTmdbAnimeId(anime)

            if (!tmdbId) {
                console.warn(`[TMDb Episode Provider] ⚠️ Could not find TMDb match for ${anime.title?.english || anime.title?.romaji}`)
                return
            }

            console.log(`[TMDb Episode Provider] ✅ Found TMDb ID: ${tmdbId}`)

            // Fetch all episodes from TMDb
            episodeMap = await fetchAllEpisodeImages(tmdbId)

            // Cache the result
            $store.set(cacheKey, {
                tmdbId,
                episodes: Array.from(episodeMap.entries()).map(([key, imageUrl]) => {
                    const [season, episode] = key.split("-").map(Number)
                    return { seasonNumber: season, episodeNumber: episode, imageUrl }
                }),
                cachedAt: Date.now()
            })
            console.log("[TMDb Episode Provider] 💾 Cached data saved")
        }

        // Replace episode images
        if (anime.episodes && Array.isArray(anime.episodes)) {
            let replacedCount = 0
            for (const episode of anime.episodes) {
                if (episode && episode.seasonNumber !== undefined && episode.episodeNumber !== undefined) {
                    const key = `${episode.seasonNumber}-${episode.episodeNumber}`
                    const tmdbImageUrl = episodeMap.get(key)

                    if (tmdbImageUrl && episode.image) {
                        console.log(`[TMDb Episode Provider] 🖼️ Replacing S${episode.seasonNumber}E${episode.episodeNumber}`)
                        episode.image = tmdbImageUrl
                        replacedCount++
                    }
                }
            }
            console.log(`[TMDb Episode Provider] ✅ Replaced ${replacedCount} images for ${anime.title?.english || anime.title?.romaji}`)
        }
    }

    async function findTmdbAnimeId(anime: any): Promise<number | null> {
        // Try different search queries
        const queries = [
            anime.title?.english,
            anime.title?.romaji,
            ...(anime.synonyms || []).slice(0, 2)
        ].filter(Boolean)

        console.log(`[TMDb Episode Provider] 🔎 Searching with queries: ${queries.join(", ")}`)

        for (const query of queries) {
            try {
                const res = await fetch(
                    `${TMDB_API_BASE}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`
                )
                
                if (!res.ok) {
                    console.error(`[TMDb Episode Provider] API error: ${res.statusText}`)
                    continue
                }
                
                const data = await res.json() as any
                const results = data.results || []

                if (results.length > 0) {
                    const result = results[0]
                    console.log(`[TMDb Episode Provider] ✅ Found: ${result.name} (ID: ${result.id})`)
                    return result.id
                }
            } catch (error) {
                console.error(`[TMDb Episode Provider] Search error for "${query}":`, error)
            }
        }

        return null
    }

    async function fetchAllEpisodeImages(tmdbId: number): Promise<Map<string, string>> {
        const episodes = new Map<string, string>()

        try {
            // Get TV show info to know how many seasons exist
            console.log(`[TMDb Episode Provider] 📺 Fetching show details for ID: ${tmdbId}`)
            const tvRes = await fetch(
                `${TMDB_API_BASE}/tv/${tmdbId}?api_key=${TMDB_API_KEY}`
            )

            if (!tvRes.ok) {
                console.error(`[TMDb Episode Provider] Failed to get show details`)
                return episodes
            }

            const tvShow = await tvRes.json() as any

            if (!tvShow || !tvShow.number_of_seasons) {
                console.log("[TMDb Episode Provider] No seasons found")
                return episodes
            }

            console.log(`[TMDb Episode Provider] 📚 Found ${tvShow.number_of_seasons} seasons`)

            // Fetch each season
            for (let season = 0; season < tvShow.number_of_seasons; season++) {
                try {
                    console.log(`[TMDb Episode Provider] 📺 Fetching season ${season}...`)
                    const seasonRes = await fetch(
                        `${TMDB_API_BASE}/tv/${tmdbId}/season/${season}?api_key=${TMDB_API_KEY}`
                    )

                    if (!seasonRes.ok) {
                        console.warn(`[TMDb Episode Provider] Failed to fetch season ${season}`)
                        continue
                    }

                    const seasonData = await seasonRes.json() as any
                    const seasonEpisodes = seasonData.episodes || []

                    for (const ep of seasonEpisodes) {
                        if (ep.still_path) {
                            const key = `${season}-${ep.episode_number}`
                            const imageUrl = `https://image.tmdb.org/t/p/original${ep.still_path}`
                            episodes.set(key, imageUrl)
                        }
                    }

                    // Add a small delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 100))
                } catch (error) {
                    console.error(`[TMDb Episode Provider] Error fetching season ${season}:`, error)
                }
            }

            console.log(`[TMDb Episode Provider] ✅ Fetched ${episodes.size} episode images`)
        } catch (error) {
            console.error("[TMDb Episode Provider] Error fetching episodes:", error)
        }

        return episodes
    }

    // Register UI context for settings and logging
    try {
        $ui.register((ctx) => {
            console.log("[TMDb Episode Provider] 🎨 UI context registered")

            const status = ctx.state("Ready")

            // Create a tray for plugin status
            const tray = ctx.newTray({
                tooltipText: "TMDb Episode Provider",
                withContent: true,
            })

            tray.render(() => {
                return tray.stack([
                    tray.text("TMDb Episode Provider", { className: "font-bold" }),
                    tray.text(`Status: ${status.get()}`, { className: "text-sm" }),
                    tray.button("Test", {
                        size: "sm",
                        onClick: ctx.eventHandler("test", () => {
                            console.log("[TMDb Episode Provider] Test button clicked")
                            ctx.toast.success("Plugin is working!")
                        }),
                    }),
                ])
            })

            console.log("[TMDb Episode Provider] ✅ Plugin fully loaded and ready!")
        })
    } catch (err) {
        console.error("[TMDb Episode Provider] Failed to register UI:", err)
    }
}
