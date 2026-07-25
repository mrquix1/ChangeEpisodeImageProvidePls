/// <reference path="./plugin.d.ts" />
/// <reference path="./system.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./core.d.ts" />

function init() {
    const TMDB_API_KEY = "1a1c34ba2f8d63191cd5b163d74d1c52"
    const TMDB_BASE_URL = "https://api.themoviedb.org/3"
    const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original"
    
    $app.onAnimeEpisodeMetadata((e) => {
        if (!e.animeEpisodeMetadata?.image?.includes("thetvdb")) {
            e.next()
            return
        }
        
        console.log("[TMDb] Episode", e.episodeNumber)
        
        try {
            const findUrl = TMDB_BASE_URL + "/find/" + e.mediaId + "?api_key=" + TMDB_API_KEY + "&external_source=anilist_id"
            const findResp = fetch(findUrl)
            
            if (!findResp?.tv_results?.[0]) {
                e.next()
                return
            }
            
            const tmdbId = findResp.tv_results[0].id
            console.log("[TMDb] TMDb ID:", tmdbId)
            
            const epUrl = TMDB_BASE_URL + "/tv/" + tmdbId + "/season/3/episode/" + e.episodeNumber + "?api_key=" + TMDB_API_KEY
            const epResp = fetch(epUrl)
            
            if (epResp?.still_path) {
                e.animeEpisodeMetadata.image = TMDB_IMAGE_BASE_URL + epResp.still_path
                console.log("[TMDb] REPLACED", e.episodeNumber)
            }
        } catch (err) {
            console.error("[TMDb] Error:", err)
        }
        
        e.next()
    })
}
