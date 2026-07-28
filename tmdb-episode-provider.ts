/// <reference path="./core.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./plugin.d.ts" />

const TMDB_API_KEY = "7b7daf721c0b4b5789d993c24402a9dc"
const TMDB_API_BASE = "https://api.themoviedb.org/3"

function init() {
    console.log("[TMDb Provider] ✅ Plugin init started")

    // Register hook FIRST
    $app.onGetAnimeDetails((e) => {
        console.log("[TMDb Provider] Hook fired for anime:", e.anime?.title?.english)
        
        if (!e.anime || !e.anime.episodes || e.anime.episodes.length === 0) {
            e.next()
            return
        }

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

        tray.render(() => {
            return tray.stack([
                tray.text("TMDb Episode Provider", { className: "font-bold" }),
                tray.text(`Status: ${status.get()}`, { className: "text-sm" }),
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
            console.log(`[TMDb Provider] Processing ${anime.title?.english}`)

            if (!anime.episodes || anime.episodes.length === 0) {
                return
            }

            // Search TMDb
            const tmdbId = await searchTmdbAnime(anime)
            if (!tmdbId) {
                console.warn(`[TMDb Provider] No TMDb match found`)
                return
            }

            console.log(`[TMDb Provider] Found TMDb ID: ${tmdbId}`)

            // Get episodes
            const episodeMap = await getEpisodeImages(tmdbId)

            // Replace images
            let replaced = 0
            for (const ep of anime.episodes) {
                if (ep && ep.seasonNumber !== undefined && ep.episodeNumber !== undefined) {
                    const key = `${ep.seasonNumber}-${ep.episodeNumber}`
                    const imageUrl = episodeMap.get(key)

                    if (imageUrl && ep.image) {
                        ep.image = imageUrl
                        replaced++
                    }
                }
            }

            console.log(`[TMDb Provider] ✅ Replaced ${replaced} images`)
        } catch (error) {
            console.error(`[TMDb Provider] Error:`, error)
        }
    }

    async function searchTmdbAnime(anime: any): Promise<number | null> {
        const queries = [
            anime.title?.english,
            anime.title?.romaji,
            ...(anime.synonyms || []).slice(0, 2),
        ].filter(Boolean)

        for (const query of queries) {
            try {
                const res = await fetch(
                    `${TMDB_API_BASE}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`
                )

                if (!res.ok) continue

                const data = await res.json() as any
                if (data.results && data.results.length > 0) {
                    return data.results[0].id
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
            // Get show info
            const showRes = await fetch(
                `${TMDB_API_BASE}/tv/${tmdbId}?api_key=${TMDB_API_KEY}`
            )

            if (!showRes.ok) return episodes

            const show = await showRes.json() as any
            const seasonCount = show.number_of_seasons || 0

            // Get each season
            for (let season = 0; season < seasonCount; season++) {
                try {
                    const seasonRes = await fetch(
                        `${TMDB_API_BASE}/tv/${tmdbId}/season/${season}?api_key=${TMDB_API_KEY}`
                    )

                    if (!seasonRes.ok) continue

                    const seasonData = await seasonRes.json() as any
                    const seasonEpisodes = seasonData.episodes || []

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

            console.log(`[TMDb Provider] Fetched ${episodes.size} episode images`)
        } catch (error) {
            console.error("[TMDb Provider] Get episodes error:", error)
        }

        return episodes
    }
}
