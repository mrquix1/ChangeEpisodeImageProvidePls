/// <reference path="./core.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./plugin.d.ts" />

const TMDB_API_KEY = "7b7daf721c0b4b5789d993c24402a9dc"
const TMDB_API_BASE = "https://api.themoviedb.org/3"

function init() {
    console.log("[TMDb Provider] ✅ Plugin init started")

    // Cache for episode images to avoid repeated API calls
    const imageCache = new Map<number, Map<string, string>>()

    // Define all helper functions FIRST
    async function replaceMetadataEpisodeImages(mediaId: number, animeMetadata: any) {
        try {
            console.log(`[TMDb Provider] Replacing images for media ${mediaId}`)

            // Check if we have cached data for this media
            let episodeMap = imageCache.get(mediaId)

            if (!episodeMap) {
                console.log(`[TMDb Provider] No cache found, fetching from TMDb...`)

                // Search for anime on TMDb
                const tmdbId = await searchTmdbAnimeByMediaId(mediaId, animeMetadata)

                if (!tmdbId) {
                    console.warn(`[TMDb Provider] No TMDb match found for media ${mediaId}`)
                    return
                }

                console.log(`[TMDb Provider] Found TMDb ID: ${tmdbId}`)

                // Fetch all episodes
                episodeMap = await getEpisodeImages(tmdbId)

                if (episodeMap.size === 0) {
                    console.warn(`[TMDb Provider] No episode images found on TMDb`)
                    return
                }

                // Cache the results
                imageCache.set(mediaId, episodeMap)
                console.log(`[TMDb Provider] Cached ${episodeMap.size} episode images`)
            } else {
                console.log(`[TMDb Provider] Using cached data`)
            }

            // Replace episode images in metadata
            let replaced = 0
            for (const [key, imageUrl] of episodeMap.entries()) {
                if (animeMetadata.episodes[key]) {
                    console.log(`[TMDb Provider] Replacing image for episode ${key}`)
                    animeMetadata.episodes[key].image = imageUrl
                    animeMetadata.episodes[key].hasImage = true
                    replaced++
                }
            }

            console.log(`[TMDb Provider] ✅ Replaced ${replaced} episode images`)
        } catch (error) {
            console.error(`[TMDb Provider] Error:`, error)
        }
    }

    async function searchTmdbAnimeByMediaId(mediaId: number, animeMetadata: any): Promise<number | null> {
        const queries: string[] = []

        // Build search queries from metadata
        if (animeMetadata.title) {
            if (typeof animeMetadata.title === "string") {
                queries.push(animeMetadata.title)
            } else {
                if (animeMetadata.title.english) queries.push(animeMetadata.title.english)
                if (animeMetadata.title.romaji) queries.push(animeMetadata.title.romaji)
                if (animeMetadata.title.userPreferred) queries.push(animeMetadata.title.userPreferred)
            }
        }
        if (animeMetadata.englishTitle) queries.push(animeMetadata.englishTitle)
        if (animeMetadata.romajiTitle) queries.push(animeMetadata.romajiTitle)
        if (animeMetadata.synonyms && Array.isArray(animeMetadata.synonyms)) {
            queries.push(...animeMetadata.synonyms.slice(0, 2))
        }

        const uniqueQueries = Array.from(new Set(queries)).filter(Boolean)
        console.log(`[TMDb Provider] Searching with: ${uniqueQueries.join(", ")}`)

        for (const query of uniqueQueries) {
            try {
                const res = await fetch(
                    `${TMDB_API_BASE}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`
                )

                if (!res.ok) {
                    console.log(`[TMDb Provider] Search failed for "${query}": ${res.statusText}`)
                    continue
                }

                const data = await res.json() as any
                console.log(`[TMDb Provider] Search results for "${query}": ${data.results?.length || 0}`)

                if (data.results && data.results.length > 0) {
                    const result = data.results[0]
                    console.log(`[TMDb Provider] Match: ${result.name} (ID: ${result.id})`)
                    return result.id
                }
            } catch (e) {
                console.error(`[TMDb Provider] Search error for "${query}":`, e)
            }
        }

        return null
    }

    async function getEpisodeImages(tmdbId: number): Promise<Map<string, string>> {
        const episodes = new Map<string, string>()

        try {
            console.log(`[TMDb Provider] Fetching show ${tmdbId}...`)

            // Get show info
            const showRes = await fetch(
                `${TMDB_API_BASE}/tv/${tmdbId}?api_key=${TMDB_API_KEY}`
            )

            if (!showRes.ok) {
                console.error(`[TMDb Provider] Failed to get show: ${showRes.statusText}`)
                return episodes
            }

            const show = await showRes.json() as any
            const seasonCount = show.number_of_seasons || 0
            console.log(`[TMDb Provider] Found ${seasonCount} seasons`)

            // Get each season
            for (let season = 0; season < seasonCount; season++) {
                try {
                    console.log(`[TMDb Provider] Fetching season ${season}...`)

                    const seasonRes = await fetch(
                        `${TMDB_API_BASE}/tv/${tmdbId}/season/${season}?api_key=${TMDB_API_KEY}`
                    )

                    if (!seasonRes.ok) {
                        console.log(`[TMDb Provider] Season ${season}: ${seasonRes.statusText}`)
                        continue
                    }

                    const seasonData = await seasonRes.json() as any
                    const seasonEpisodes = seasonData.episodes || []
                    console.log(`[TMDb Provider] Season ${season}: ${seasonEpisodes.length} episodes`)

                    for (const ep of seasonEpisodes) {
                        if (ep.still_path) {
                            const key = `${ep.episode_number}` // Main episodes: "1", "2", etc
                            const imageUrl = `https://image.tmdb.org/t/p/original${ep.still_path}`
                            episodes.set(key, imageUrl)
                        }
                    }

                    // Delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 100))
                } catch (e) {
                    console.error(`[TMDb Provider] Season ${season} error:`, e)
                }
            }

            console.log(`[TMDb Provider] Fetched ${episodes.size} episode images total`)
        } catch (error) {
            console.error("[TMDb Provider] Get episodes error:", error)
        }

        return episodes
    }

    // Register hook - fires when anime metadata is being processed
    $app.onAnimeMetadata((e) => {
        console.log("[TMDb Provider] Hook fired - onAnimeMetadata")
        console.log("[TMDb Provider] Media ID:", e.mediaId)

        if (!e.animeMetadata) {
            console.log("[TMDb Provider] No anime metadata")
            e.next()
            return
        }

        if (!e.animeMetadata.episodes) {
            console.log("[TMDb Provider] No episodes in metadata")
            e.next()
            return
        }

        console.log(`[TMDb Provider] Processing metadata for media ID: ${e.mediaId}`)

        // Run async replacement
        ;(async () => {
            try {
                await replaceMetadataEpisodeImages(e.mediaId, e.animeMetadata)
            } catch (error) {
                console.error("[TMDb Provider] Replacement error:", error)
            }
        })()

        e.next()
    })

    // MUST register UI context - this is mandatory for plugins
    $ui.register((ctx) => {
        console.log("[TMDb Provider] ✅ UI context registered")

        // Create tray
        const tray = ctx.newTray({
            tooltipText: "TMDb Episode Provider",
            withContent: true,
        })

        const status = ctx.state("Ready")
        const lastAnime = ctx.state("None")

        tray.render(() => {
            return tray.stack([
                tray.text("TMDb Episode Provider", { className: "font-bold" }),
                tray.text(`Status: ${status.get()}`, { className: "text-sm" }),
                tray.text(`Last: ${lastAnime.get()}`, { className: "text-xs" }),
                tray.button("Clear Cache", {
                    size: "sm",
                    onClick: ctx.eventHandler("clear-cache", () => {
                        imageCache.clear()
                        status.set("Cache Cleared")
                        ctx.toast.success("Image cache cleared!")
                        ctx.setTimeout(() => {
                            status.set("Ready")
                        }, 2000)
                    }),
                }),
            ])
        })

        console.log("[TMDb Provider] ✅ Plugin fully loaded!")
    })
}
