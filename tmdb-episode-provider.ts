/// <reference path="./plugin.d.ts" />
/// <reference path="./system.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./core.d.ts" />

const TMDB_API_KEY = "1a1c34ba2f8d63191cd5b163d74d1c52"
const TMDB_BASE_URL = "https://api.themoviedb.org/3"
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original"

function init() {
    $app.onAnimeEpisodeMetadata((e) => {
        console.log("[TMDb] Episode", e.episodeNumber, "mediaId:", e.mediaId)
        
        if (!e.animeEpisodeMetadata || !e.animeEpisodeMetadata.image) {
            e.next()
            return
        }
        
        const currentImage = e.animeEpisodeMetadata.image
        
        if (currentImage.indexOf("thetvdb") !== -1) {
            console.log("[TMDb] Found TheTVDB, fetching TMDb...")
            
            const tmdbId = getTmdbIdFromAnilist(e.mediaId)
            console.log("[TMDb] TMDb ID:", tmdbId)
            
            if (tmdbId) {
                // Try seasons 1-5 to find the episode
                for (let season = 1; season <= 5; season++) {
                    const tmdbImage = getTmdbEpisodeImage(tmdbId, season, e.episodeNumber)
                    if (tmdbImage) {
                        console.log("[TMDb] Found image in season", season)
                        e.animeEpisodeMetadata.image = tmdbImage
                        e.animeEpisodeMetadata.hasImage = true
                        console.log("[TMDb] REPLACED!")
                        break
                    }
                }
            }
        }
        
        e.next()
    })
}

function getTmdbIdFromAnilist(anilistId) {
    try {
        const url = TMDB_BASE_URL + "/find/" + anilistId + "?api_key=" + TMDB_API_KEY + "&external_source=anilist_id"
        const response = fetch(url)
        
        if (response && response.tv_results && response.tv_results.length > 0) {
            return response.tv_results[0].id
        }
    } catch (error) {
        console.error("[TMDb] Error:", error)
    }
    
    return null
}

function getTmdbEpisodeImage(tmdbId, seasonNumber, episodeNumber) {
    try {
        const url = TMDB_BASE_URL + "/tv/" + tmdbId + "/season/" + seasonNumber + "/episode/" + episodeNumber + "?api_key=" + TMDB_API_KEY
        const response = fetch(url)
        
        if (response && response.still_path) {
            return TMDB_IMAGE_BASE_URL + response.still_path
        }
    } catch (error) {
        // Silent
    }
    
    return null
}
