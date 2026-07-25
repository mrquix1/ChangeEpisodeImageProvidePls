/// <reference path="./plugin.d.ts" />
/// <reference path="./system.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./core.d.ts" />

const TMDB_API_KEY = "1a1c34ba2f8d63191cd5b163d74d1c52"
const TMDB_BASE_URL = "https://api.themoviedb.org/3"
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original"

function init() {
    $app.onAnimeMetadata((e) => {
        console.log("[TMDb] onAnimeMetadata fired, mediaId:", e.mediaId)
        
        if (!e.animeMetadata || !e.animeMetadata.episodes) {
            console.log("[TMDb] No episodes")
            e.next()
            return
        }
        
        const tmdbId = getTmdbIdFromAnilist(e.mediaId)
        if (!tmdbId) {
            console.log("[TMDb] No TMDb ID found")
            e.next()
            return
        }
        
        console.log("[TMDb] TMDb ID:", tmdbId)
        
        let replaced = 0
        for (const key in e.animeMetadata.episodes) {
            const episode = e.animeMetadata.episodes[key]
            if (!episode.image) continue
            
            if (episode.image.indexOf("thetvdb") !== -1) {
                const tmdbImage = getTmdbEpisodeImage(tmdbId, parseInt(key.substring(1)))
                if (tmdbImage) {
                    episode.image = tmdbImage
                    replaced++
                    console.log("[TMDb] Replaced episode", key)
                }
            }
        }
        
        console.log("[TMDb] REPLACED", replaced, "episodes")
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
        console.error("[TMDb] Error finding TMDb ID:", error)
    }
    
    return null
}

function getTmdbEpisodeImage(tmdbId, episodeNumber) {
    try {
        const url = TMDB_BASE_URL + "/tv/" + tmdbId + "/season/1/episode/" + episodeNumber + "?api_key=" + TMDB_API_KEY
        const response = fetch(url)
        
        if (response && response.still_path) {
            return TMDB_IMAGE_BASE_URL + response.still_path
        }
    } catch (error) {
        console.error("[TMDb] Error getting episode image:", error)
    }
    
    return null
}
