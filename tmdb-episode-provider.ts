/// <reference path="./plugin.d.ts" />
/// <reference path="./system.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./core.d.ts" />

const TMDB_API_KEY = "1a1c34ba2f8d63191cd5b163d74d1c52"
const TMDB_BASE_URL = "https://api.themoviedb.org/3"
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original"

function init() {
    $app.onAnimeEpisodeMetadata((e) => {
        if (!e.animeEpisodeMetadata?.image?.includes("thetvdb")) {
            e.next()
            return
        }
        
        console.log("[TMDb] Processing episode", e.episodeNumber, "mediaId", e.mediaId)
        
        try {
            // Get TMDb ID
            const findUrl = TMDB_BASE_URL + "/find/" + e.mediaId + "?api_key=" + TMDB_API_KEY + "&external_source=anilist_id"
            const findResp = fetch(findUrl)
            
            if (!findResp?.tv_results?.[0]) {
                console.log("[TMDb] No TMDb match")
                e.next()
                return
            }
            
            const tmdbId = findResp.tv_results[0].id
            console.log("[TMDb] Found TMDb ID:", tmdbId)
            
            // Try to get episode from season 3 (since this is My Hero Academia S3)
            const epUrl = TMDB_BASE_URL + "/tv/" + tmdbId + "/season/3/episode/" + e.episodeNumber + "?api_key=" + TMDB_API_KEY
            const epResp = fetch(epUrl)
            
            if (epResp?.still_path) {
                const newUrl = TMDB_IMAGE_BASE_URL + epResp.still_path
                e.animeEpisodeMetadata.image = newUrl
                console.log("[TMDb] REPLACED episode", e.episodeNumber)
            } else {
                console.log("[TMDb] No still_path in response for episode", e.episodeNumber)
            }
        } catch (err) {
            console.error("[TMDb] Error:", err)
        }
        
        e.next()
    })
}
