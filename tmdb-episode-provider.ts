/// <reference path="./plugin.d.ts" />
/// <reference path="./system.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./core.d.ts" />

const TMDB_API_KEY = "1a1c34ba2f8d63191cd5b163d74d1c52"
const TMDB_BASE_URL = "https://api.themoviedb.org/3"
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original"

let episodeImageCache = {}

function init() {
    console.log("[TMDb] Extension initialized")
    
    $app.onGetAnime((e) => {
        console.log("[TMDb] onGetAnime hook triggered for anime:", e.anime?.id)
        
        if (e.anime) {
            const animeId = e.anime.id
            const tvdbId = e.anime.idMal  // Try MAL ID as fallback
            console.log("[TMDb] Anime ID:", animeId, "MAL ID:", tvdbId)
            
            // Try to get episodes - check if it's in a different property
            let episodes = null
            if (Array.isArray(e.anime.episodes)) {
                episodes = e.anime.episodes
            } else if (typeof e.anime.episodes === 'object' && e.anime.episodes) {
                // It might be an object with episode data
                console.log("[TMDb] Episodes object:", Object.keys(e.anime.episodes))
            }
            
            // Check if there's a different way to access episodes
            console.log("[TMDb] Checking anime object for episode data...")
            console.log("[TMDb] e.anime.toCompleteAnime:", typeof e.anime.toCompleteAnime)
            
            if (typeof e.anime.toCompleteAnime === 'function') {
                const complete = e.anime.toCompleteAnime()
                console.log("[TMDb] Complete anime keys:", Object.keys(complete || {}))
                if (complete && complete.episodes) {
                    console.log("[TMDb] Found episodes in complete anime:", complete.episodes.length)
                    episodes = complete.episodes
                }
            }
            
            if (episodes && Array.isArray(episodes)) {
                console.log("[TMDb] Processing", episodes.length, "episodes")
                episodes.forEach((ep, idx) => {
                    if (idx < 3) {
                        console.log(`[TMDb] Episode ${idx}:`, Object.keys(ep))
                    }
                })
            }
        }
        
        e.next()
    })

    $ui.register((ctx) => {
        console.log("[TMDb] UI context registered")
    })
}

function getTmdbEpisodeImage(tvdbId, season, episodeNumber) {
    const cacheKey = `${tvdbId}_${season}_${episodeNumber}`
    if (episodeImageCache[cacheKey]) {
        console.log(`[TMDb] Cache hit for ${cacheKey}`)
        return episodeImageCache[cacheKey]
    }

    try {
        console.log(`[TMDb] Looking up TVDB ID ${tvdbId} for S${season}E${episodeNumber}`)
        const searchUrl = `${TMDB_BASE_URL}/find/${tvdbId}?api_key=${TMDB_API_KEY}&external_source=tvdb_id`
        const response = $http.get(searchUrl)
        
        if (!response || !response.tv_results || response.tv_results.length === 0) {
            console.log(`[TMDb] No results found for TVDB ID ${tvdbId}`)
            return null
        }

        const tmdbShowId = response.tv_results[0].id
        console.log(`[TMDb] Found TMDb show ID: ${tmdbShowId}`)
        
        const episodeUrl = `${TMDB_BASE_URL}/tv/${tmdbShowId}/season/${season}/episode/${episodeNumber}?api_key=${TMDB_API_KEY}`
        const episodeResponse = $http.get(episodeUrl)

        if (episodeResponse && episodeResponse.still_path) {
            const imageUrl = TMDB_IMAGE_BASE_URL + episodeResponse.still_path
            console.log(`[TMDb] Found image for S${season}E${episodeNumber}: ${imageUrl}`)
            episodeImageCache[cacheKey] = imageUrl
            return imageUrl
        }

        console.log(`[TMDb] No image found for S${season}E${episodeNumber}`)
        return null
    } catch (error) {
        console.error(`[TMDb] Error fetching image for S${season}E${episodeNumber}:`, error)
        return null
    }
}
