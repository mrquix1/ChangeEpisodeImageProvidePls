/// <reference path="./plugin.d.ts" />
/// <reference path="./system.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./core.d.ts" />

const TMDB_API_KEY = "1a1c34ba2f8d63191cd5b163d74d1c52"
const TMDB_BASE_URL = "https://api.themoviedb.org/3"
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original"

function init() {
    $app.onAnimeMetadataRequested((e) => {
        console.log("[TMDb] onAnimeMetadataRequested fired")
        
        if (!e.animeMetadata || !e.animeMetadata.episodes) {
            console.log("[TMDb] No episodes found")
            e.next()
            return
        }
        
        const episodes = e.animeMetadata.episodes
        const mediaId = e.animeMetadata.mediaId
        console.log("[TMDb] Processing episodes for media:", mediaId)
        
        let replaced = 0
        for (const key in episodes) {
            const episode = episodes[key]
            if (!episode || !episode.image) continue
            
            console.log("[TMDb] Episode", key, "image:", episode.image.substring(0, 60))
            
            if (episode.image.indexOf("thetvdb") !== -1) {
                console.log("[TMDb] Found TheTVDB episode image")
                const tmdbImage = getTmdbImage(mediaId)
                if (tmdbImage) {
                    episode.image = tmdbImage
                    episode.hasImage = true
                    replaced++
                    console.log("[TMDb] Replaced episode", key)
                }
            }
        }
        
        console.log("[TMDb] REPLACED", replaced, "episode images")
        e.next()
    })
}

function getTmdbImage(anilistId) {
    try {
        const url = TMDB_BASE_URL + "/find/" + anilistId + "?api_key=" + TMDB_API_KEY + "&external_source=anilist_id"
        const response = fetch(url)
        
        if (response && response.tv_results && response.tv_results.length > 0) {
            const show = response.tv_results[0]
            if (show.backdrop_path) {
                return TMDB_IMAGE_BASE_URL + show.backdrop_path
            }
        }
    } catch (error) {
        console.error("[TMDb] Error:", error)
    }
    
    return null
}
