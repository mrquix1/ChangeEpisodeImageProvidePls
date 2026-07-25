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
            e.next()
            return
        }
        
        const tmdbId = getTmdbIdFromAnilist(e.mediaId)
        if (!tmdbId) {
            e.next()
            return
        }
        
        console.log("[TMDb] TMDb ID:", tmdbId)
        
        // Get show info to find total seasons
        const showUrl = TMDB_BASE_URL + "/tv/" + tmdbId + "?api_key=" + TMDB_API_KEY
        const showResponse = fetch(showUrl)
        
        if (!showResponse || !showResponse.seasons) {
            e.next()
            return
        }
        
        let replaced = 0
        
        // Try all seasons
        for (let seasonIdx = 0; seasonIdx < showResponse.seasons.length; seasonIdx++) {
            const season = showResponse.seasons[seasonIdx]
            const seasonNum = season.season_number
            
            console.log("[TMDb] Fetching season", seasonNum)
            
            const seasonUrl = TMDB_BASE_URL + "/tv/" + tmdbId + "/season/" + seasonNum + "?api_key=" + TMDB_API_KEY
            const seasonResponse = fetch(seasonUrl)
            
            if (!seasonResponse || !seasonResponse.episodes) continue
            
            for (let epIdx = 0; epIdx < seasonResponse.episodes.length; epIdx++) {
                const tmdbEpisode = seasonResponse.episodes[epIdx]
                const episodeNum = tmdbEpisode.episode_number
                const key = "e" + episodeNum
                
                if (e.animeMetadata.episodes[key] && e.animeMetadata.episodes[key].image) {
                    if (e.animeMetadata.episodes[key].image.indexOf("thetvdb") !== -1) {
                        if (tmdbEpisode.still_path) {
                            e.animeMetadata.episodes[key].image = TMDB_IMAGE_BASE_URL + tmdbEpisode.still_path
                            replaced++
                            console.log("[TMDb] Replaced E" + episodeNum)
                        }
                    }
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
        console.error("[TMDb] Error:", error)
    }
    
    return null
}
