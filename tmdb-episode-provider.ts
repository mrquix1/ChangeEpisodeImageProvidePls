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
        
        if (!e.animeMetadata) {
            e.next()
            return
        }
        
        const tmdbId = e.animeMetadata.mappings.themoviedbId
        console.log("[TMDb] TMDb ID:", tmdbId)
        
        if (!tmdbId) {
            console.log("[TMDb] No TMDb ID")
            e.next()
            return
        }
        
        // Fetch episodes from TMDb
        try {
            const url = TMDB_BASE_URL + "/tv/" + tmdbId + "?api_key=" + TMDB_API_KEY
            const response = fetch(url)
            
            if (response && response.seasons) {
                console.log("[TMDb] Got TMDb show data")
                
                for (let seasonIdx = 0; seasonIdx < response.seasons.length; seasonIdx++) {
                    const season = response.seasons[seasonIdx]
                    
                    // Fetch season details for episode images
                    const seasonUrl = TMDB_BASE_URL + "/tv/" + tmdbId + "/season/" + season.season_number + "?api_key=" + TMDB_API_KEY
                    const seasonResponse = fetch(seasonUrl)
                    
                    if (seasonResponse && seasonResponse.episodes) {
                        for (let epIdx = 0; epIdx < seasonResponse.episodes.length; epIdx++) {
                            const tmdbEpisode = seasonResponse.episodes[epIdx]
                            const episodeNumber = tmdbEpisode.episode_number
                            const key = "e" + episodeNumber
                            
                            if (tmdbEpisode.still_path && !e.animeMetadata.episodes[key]) {
                                e.animeMetadata.episodes[key] = {
                                    image: TMDB_IMAGE_BASE_URL + tmdbEpisode.still_path,
                                    hasImage: true
                                }
                                console.log("[TMDb] Added episode", episodeNumber)
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error("[TMDb] Error:", error)
        }
        
        e.next()
    })
}
