/// <reference path="./core.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./plugin.d.ts" />

const TMDB_API_KEY = "7b7daf721c0b4b5789d993c24402a9dc"
const TMDB_API_BASE = "https://api.themoviedb.org/3"

function init() {
    console.log("[TMDb Provider] ✅ Plugin init started")

    // Register hook - fires when anime library data is requested
    $app.onAnimeEntryLibraryDataRequested((e) => {
        console.log("[TMDb Provider] Hook fired - onAnimeEntryLibraryDataRequested")
        console.log("[TMDb Provider] Anime object:", e.anime)
        
        if (!e.anime) {
            console.log("[TMDb Provider] No anime object")
            e.next()
            return
        }

        if (!e.anime.episodes || e.anime.episodes.length === 0) {
            console.log("[TMDb Provider] No episodes")
            e.next()
            return
        }

        console.log(`[TMDb Provider] Processing anime ID: ${e.anime.id} with ${e.anime.episodes.length} episodes`)

        // Run async replacement
        ;(async () => {
            try {
                await replaceEpisodeImages(e.anime)
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
                tray.button("Test", {
                    size: "sm",
                    onClick: ctx.eventHandler("test", () => {
                        status.set("Testing...")
                        ctx.toast.success("Plugin is working!")
                        status.set("Ready")
                    }),
                }),
            ])
        })

        console.log("[TMDb Provider] ✅ Plugin fully loaded!")
    })

    async function replaceEpisodeImages(anime: any) {
        try {
            const animeTitle = getAnimeTitle(anime)
            console.log(`[TMDb Provider] Processing: ${animeTitle}`)

            if (!anime.episodes || anime.episodes.length === 0) {
                console.log("[TMDb Provider] No episodes to process")
                return
            }

            // Search TMDb
            const tmdbId = await searchTmdbAnime(anime)
            if (!tmdbId) {
                console.warn(`[TMDb Provider] No TMDb match found for ${animeTitle}`)
                return
            }

            console.log(`[TMDb Provider] Found TMDb ID: ${tmdbId}`)

            // Get episodes
            const episodeMap = await getEpisodeImages(tmdbId)

            if (episodeMap.size === 0) {
                console.warn(`[TMDb Provider] No episode images found`)
                return
            }

            // Replace images
            let replaced = 0
            for (const ep of anime.episodes) {
                if (ep && ep.seasonNumber !== undefined && ep.episodeNumber !== undefined) {
                    const key = `${ep.seasonNumber}-${ep.episodeNumber}`
                    const imageUrl = episodeMap.get(key)

                    if (imageUrl && ep.image) {
                        console.log(`[TMDb Provider] Replacing S${ep.seasonNumber}E${ep.episodeNumber}`)
                        ep.image = imageUrl
                        replaced++
                    }
                }
            }

            console.log(`[TMDb Provider] ✅ Replaced ${replaced}/${anime.episodes.length} images`)
        } catch (error) {
            console.error(`[TMDb Provider] Error:`, error)
        }
    }

    function getAnimeTitle(anime: any): string {
        if (!anime) return "Unknown"
        if (anime.title) {
            if (typeof anime.title === "string") return anime.title
            if (anime.title.english) return anime.title.english
            if (anime.title.romaji) return anime.title.romaji
        }
        if (anime.englishTitle) return anime.englishTitle
        if (anime.romajiTitle) return anime.romajiTitle
        return `ID: ${anime.id}`
    }

    async function searchTmdbAnime(anime: any): Promise<number | null> {
        const queries: string[] = []

        // Build search queries
        if (anime.title) {
            if (typeof anime.title === "string") {
                queries.push(anime.title)
            } else {
                if (anime.title.english) queries.push(anime.title.english)
                if (anime.title.romaji) queries.push(anime.title.romaji)
            }
        }
        if (anime.englishTitle) queries.push(anime.englishTitle)
        if (anime.romajiTitle) queries.push(anime.romajiTitle)
        if (anime.synonyms) {
            queries.push(...anime.synonyms.slice(0, 2))
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
                console.log(`[TMDb Provider] Search results for "${query}":`, data.results?.length)

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
                            const key = `${season}-${ep.episode_number}`
                            const imageUrl = `https://image.tmdb.org/t/p/original${ep.still_path}`
                            episodes.set(key, imageUrl)
                        }
                    }

                    // Delay to avoid rate limit
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
}
