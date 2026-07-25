/// <reference path="./plugin.d.ts" />
/// <reference path="./system.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./core.d.ts" />

const TMDB_API_KEY = "1a1c34ba2f8d63191cd5b163d74d1c52"
const TMDB_BASE_URL = "https://api.themoviedb.org/3"
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original"

function init() {
    $app.onAnimeEpisodeMetadata((e) => {
        console.log("[TMDb] Episode", e.episodeNumber)
        
        if (!e.animeEpisodeMetadata || !e.animeEpisodeMetadata.image) {
            e.next()
            return
        }
        
        const currentImage = e.animeEpisodeMetadata.image
        
        if (currentImage.indexOf("thetvdb") === -1) {
            e.next()
            return
        }
        
        console.log("[TMDb] TheTVDB found, getting TMDb ID...")
        
        const tmdbId = getTmdbIdFromAnilist(e.mediaId)
        console.log("[TMDb] TMDb ID:", tmdbId)
        
        if (!tmdbId) {
            e.next()
            return
        }
        
        // Try seasons 1-5
        let found = false
        for (let season = 1; season <= 5 && !found; season++) {
            console.log("[TMDb] Trying season", season)
            
            try {
                const url = TMDB_BASE_URL + "/tv/" + tmdbId + "/season/" + season + "/episode/" + e.episodeNumber + "?api_key=" + TMDB_API_KEY
                console.log("[TMDb] URL:", url.substring(0, 80))
                
                const response = fetch(url)
                console.log("[TMDb] Response:", response ? "got response" : "null")
                
                if (response) {
                    console.log("[TMDb] Response keys:", Object.keys(response))
                    
                    if (response.still_path) {
                        const newImage = TMDB_IMAGE_BASE_URL + response.still_path
                        e.animeEpisodeMetadata.image = newImage
                        e.animeEpisodeMetadata.hasImage = true
                        console.log("[TMDb] REPLACED with:", newImage.substring(0, 60))
                        found = true
                    }
                }
            } catch (err) {
                console.error("[TMDb] Season", season, "error:", err)
            }
        }
        
        if (!found) {
            console.log("[TMDb] No TMDb image found for episode", e.episodeNumber)
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
