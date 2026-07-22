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
    
    $ui.register((ctx) => {
        console.log("[TMDb] UI context registered")
        
        ctx.dom.onReady(() => {
            console.log("[TMDb] DOM ready, setting up episode image observer")
            
            // Watch for episode images in the DOM
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    // Look for img tags with thetvdb URLs
                    const images = document.querySelectorAll('img[src*="thetvdb.com"]')
                    console.log(`[TMDb] Found ${images.length} TheTVDB images`)
                    
                    images.forEach((img) => {
                        if (!img.dataset.tmdbProcessed) {
                            img.dataset.tmdbProcessed = "true"
                            console.log(`[TMDb] Processing image: ${img.src.substring(0, 60)}...`)
                            // Just log for now to see if we're catching images
                        }
                    })
                })
            })
            
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['src']
            })
        })
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
