/// <reference path="./plugin.d.ts" />
/// <reference path="./system.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./core.d.ts" />

const TMDB_API_KEY = "1a1c34ba2f8d63191cd5b163d74d1c52"
const TMDB_BASE_URL = "https://api.themoviedb.org/3"
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original"

function init() {
    $ui.register((ctx) => {
        console.log("[TMDb] UI context - fetching images")
        
        ctx.screen.onNavigate((e) => {
            if (e.pathname === "/entry") {
                const mediaId = Number(e.searchParams.id)
                console.log("[TMDb] Fetching for mediaId:", mediaId)
                
                try {
                    // Fetch TMDb ID
                    const findUrl = TMDB_BASE_URL + "/find/" + mediaId + "?api_key=" + TMDB_API_KEY + "&external_source=anilist_id"
                    const findResp = fetch(findUrl)
                    
                    if (!findResp?.tv_results?.[0]) {
                        console.log("[TMDb] No TMDb match")
                        return
                    }
                    
                    const tmdbId = findResp.tv_results[0].id
                    console.log("[TMDb] Got TMDb ID:", tmdbId)
                    
                    // Fetch all episodes from all seasons
                    const showUrl = TMDB_BASE_URL + "/tv/" + tmdbId + "?api_key=" + TMDB_API_KEY
                    const showResp = fetch(showUrl)
                    
                    if (!showResp?.seasons) {
                        console.log("[TMDb] No seasons")
                        return
                    }
                    
                    const storage = $storage.get("TMDB_EPISODE_IMAGES") || {}
                    
                    for (let season = 0; season < showResp.seasons.length; season++) {
                        const seasonNum = showResp.seasons[season].season_number
                        const seasonUrl = TMDB_BASE_URL + "/tv/" + tmdbId + "/season/" + seasonNum + "?api_key=" + TMDB_API_KEY
                        const seasonResp = fetch(seasonUrl)
                        
                        if (!seasonResp?.episodes) continue
                        
                        for (let ep = 0; ep < seasonResp.episodes.length; ep++) {
                            const episode = seasonResp.episodes[ep]
                            if (episode.still_path) {
                                const key = "ep" + episode.episode_number
                                storage[key] = TMDB_IMAGE_BASE_URL + episode.still_path
                                console.log("[TMDb] Stored episode", episode.episode_number)
                            }
                        }
                    }
                    
                    $storage.set("TMDB_EPISODE_IMAGES", storage)
                    console.log("[TMDb] Saved", Object.keys(storage).length, "images to storage")
                } catch (err) {
                    console.error("[TMDb] Error:", err)
                }
            }
        })
    })
    
    // Apply from storage in the hook
    $app.onAnimeEpisodeMetadata((e) => {
        if (!e.animeEpisodeMetadata?.image?.includes("thetvdb")) {
            e.next()
            return
        }
        
        const storage = $storage.get("TMDB_EPISODE_IMAGES") || {}
        const key = "ep" + e.episodeNumber
        
        if (storage[key]) {
            e.animeEpisodeMetadata.image = storage[key]
            e.animeEpisodeMetadata.hasImage = true
            console.log("[TMDb] Applied stored image for episode", e.episodeNumber)
        }
        
        e.next()
    })
}
