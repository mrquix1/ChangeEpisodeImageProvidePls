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
        
        if (e.anime && e.anime.episodes && e.anime.episodes.length > 0) {
            console.log(`[TMDb] Processing ${e.anime.episodes.length} episodes`)
            
            e.anime.episodes.forEach((episode, idx) => {
                if (episode.image) {
                    console.log(`[TMDb] Episode ${episode.episodeNumber} current image: ${episode.image}`)
                    const tmdbImage = getTmdbEpisodeImage(e.anime.id, episode.episodeNumber)
                    if (tmdbImage) {
                        console.log(`[TMDb] Replacing with TMDb image: ${tmdbImage}`)
                        episode.image = tmdbImage
                    }
                }
            })
        }
        
        e.next()
    })

    $ui.register((ctx) => {
        console.log("[TMDb] UI context registered")
        ctx.toast.info("TMDb Episode Provider activated")
    })
}

function getTmdbEpisodeImage(tvdbId, episodeNumber) {
    const cacheKey = `${tvdbId}_${episodeNumber}`
    if (episodeImageCache[cacheKey]) {
        console.log(`[TMDb] Cache hit for ${cacheKey}`)
        return episodeImageCache[cacheKey]
    }

    try {
        console.log(`[TMDb] Looking up TVDB ID ${tvdbId} for episode ${episodeNumber}`)
        const searchUrl = `${TMDB_BASE_URL}/find/${tvdbId}?api_key=${TMDB_API_KEY}&external_source=tvdb_id`
        const response = $http.get(searchUrl)
        
        if (!response || !response.tv_results || response.tv_results.length === 0) {
            console.log(`[TMDb] No results found for TVDB ID ${tvdbId}`)
            return null
        }

        const tmdbShowId = response.tv_results[0].id
        console.log(`[TMDb] Found TMDb show ID: ${tmdbShowId}`)
        
        const episodeUrl = `${TMDB_BASE_URL}/tv/${tmdbShowId}/season/1/episode/${episodeNumber}?api_key=${TMDB_API_KEY}`
        const episodeResponse = $http.get(episodeUrl)

        if (episodeResponse && episodeResponse.still_path) {
            const imageUrl = TMDB_IMAGE_BASE_URL + episodeResponse.still_path
            console.log(`[TMDb] Found image for episode ${episodeNumber}: ${imageUrl}`)
            episodeImageCache[cacheKey] = imageUrl
            return imageUrl
        }

        console.log(`[TMDb] No image found for episode ${episodeNumber}`)
        return null
    } catch (error) {
        console.error(`[TMDb] Error fetching image for episode ${episodeNumber}:`, error)
        return null
    }
}
