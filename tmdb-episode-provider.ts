/// <reference path="./plugin.d.ts" />
/// <reference path="./system.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./core.d.ts" />

const TMDB_API_KEY = "1a1c34ba2f8d63191cd5b163d74d1c52"
const TMDB_BASE_URL = "https://api.themoviedb.org/3"
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original"

function init() {
    $app.onMetadataLoaded((e) => {
        console.log("[TMDb] onMetadataLoaded fired")
        console.log("[TMDb] Episodes:", Object.keys(e.animeMetadata.episodes).length)
        
        if (!e.animeMetadata.episodes || Object.keys(e.animeMetadata.episodes).length === 0) {
            console.log("[TMDb] No episodes yet")
            e.next()
            return
        }
        
        const tmdbId = e.animeMetadata.mappings.themoviedbId
        console.log("[TMDb] TMDb ID:", tmdbId)
        
        if (!tmdbId) {
            console.log("[TMDb] No TMDb ID found")
            e.next()
            return
        }
        
        let replaced = 0
        for (const key in e.animeMetadata.episodes) {
            const episode = e.animeMetadata.episodes[key]
            if (!episode.image) continue
            
            if (episode.image.indexOf("thetvdb") !== -1) {
                const tmdbImage = getTmdbImage(tmdbId)
                if (tmdbImage) {
                    episode.image = tmdbImage
                    replaced++
                }
            }
        }
        
        console.log("[TMDb] Replaced", replaced, "images")
        e.next()
    })
}

function getTmdbImage(tmdbId) {
    try {
        const url = TMDB_BASE_URL + "/tv/" + tmdbId + "?api_key=" + TMDB_API_KEY
        const response = fetch(url)
        
        if (response && response.backdrop_path) {
            return TMDB_IMAGE_BASE_URL + response.backdrop_path
        }
    } catch (error) {
        console.error("[TMDb] Error:", error)
    }
    
    return null
}
