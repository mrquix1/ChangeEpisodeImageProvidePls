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
        
        const anilistId = e.animeMetadata.mappings.anilistId
        console.log("[TMDb] AniList ID:", anilistId)
        
        if (!anilistId) {
            console.log("[TMDb] No AniList ID")
            e.next()
            return
        }
        
        // Convert AniList ID to TMDb ID
        try {
            const findUrl = TMDB_BASE_URL + "/find/" + anilistId + "?api_key=" + TMDB_API_KEY + "&external_source=anilist_id"
            const findResponse = fetch(findUrl)
            
            if (findResponse && findResponse.tv_results && findResponse.tv_results.length > 0) {
                const tmdbId = findResponse.tv_results[0].id
                console.log("[TMDb] Found TMDb ID:", tmdbId)
                
                // Fetch season/episode data
                const showUrl = TMDB_BASE_URL + "/tv/" + tmdbId + "?api_key=" + TMDB_API_KEY
                const showResponse = fetch(showUrl)
                
                if (showResponse && showResponse.seasons) {
                    for (let i = 0; i < showResponse.seasons.length; i++) {
                        const season = showResponse.seasons[i]
                        
                        const seasonUrl = TMDB_BASE_URL + "/tv/" + tmdbId + "/season/" + season.season_number + "?api_key=" + TMDB_API_KEY
                        const seasonResponse = fetch(seasonUrl)
                        
                        if (seasonResponse && seasonResponse.episodes) {
                            for (let j = 0; j < seasonResponse.episodes.length; j++) {
                                const episode = seasonResponse.episodes[j]
                                if (episode.still_path) {
                                    const key = "e" + episode.episode_number
                                    e.animeMetadata.episodes[key] = {
                                        image: TMDB_IMAGE_BASE_URL + episode.still_path,
                                        hasImage: true
                                    }
                                }
                            }
                        }
                    }
                    console.log("[TMDb] Added episodes from TMDb")
                }
            }
        } catch (error) {
            console.error("[TMDb] Error:", error)
        }
        
        e.next()
    })
}
