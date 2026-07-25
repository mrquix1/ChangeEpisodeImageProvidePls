/// <reference path="./plugin.d.ts" />
/// <reference path="./system.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./core.d.ts" />

const TMDB_API_KEY = "1a1c34ba2f8d63191cd5b163d74d1c52"
const TMDB_BASE_URL = "https://api.themoviedb.org/3"
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original"

function init() {
    $app.onAnimeMetadata((e) => {
        console.log("[TMDb] onAnimeMetadata fired for mediaId:", e.mediaId)
        
        if (!e.animeMetadata?.episodes) {
            e.next()
            return
        }
        
        try {
            const findUrl = TMDB_BASE_URL + "/find/" + e.mediaId + "?api_key=" + TMDB_API_KEY + "&external_source=anilist_id"
            const findResp = fetch(findUrl)
            
            if (!findResp?.tv_results?.[0]) {
                console.log("[TMDb] No match")
                e.next()
                return
            }
            
            const tmdbId = findResp.tv_results[0].id
            console.log("[TMDb] TMDb ID:", tmdbId)
            
            const showUrl = TMDB_BASE_URL + "/tv/" + tmdbId + "?api_key=" + TMDB_API_KEY
            const showResp = fetch(showUrl)
            
            if (!showResp?.seasons) {
                e.next()
                return
            }
            
            console.log("[TMDb] Fetching episodes")
            
            for (let s = 0; s < showResp.seasons.length; s++) {
                const seasonNum = showResp.seasons[s].season_number
                const seasonUrl = TMDB_BASE_URL + "/tv/" + tmdbId + "/season/" + seasonNum + "?api_key=" + TMDB_API_KEY
                const seasonResp = fetch(seasonUrl)
                
                if (!seasonResp?.episodes) continue
                
                for (let ep = 0; ep < seasonResp.episodes.length; ep++) {
                    const episode = seasonResp.episodes[ep]
                    const epNum = episode.episode_number
                    
                    if (e.animeMetadata.episodes["e" + epNum] && episode.still_path) {
                        e.animeMetadata.episodes["e" + epNum].image = TMDB_IMAGE_BASE_URL + episode.still_path
                        console.log("[TMDb] Updated episode", epNum)
                    }
                }
            }
            
            console.log("[TMDb] Done")
        } catch (err) {
            console.error("[TMDb] Error:", err)
        }
        
        e.next()
    })
}
