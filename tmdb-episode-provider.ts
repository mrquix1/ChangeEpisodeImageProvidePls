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
    
    // Try multiple hooks to see which one fires and when
    $app.onScanCompleted((e) => {
        console.log("[TMDb] onScanCompleted fired")
        e.next()
    })
    
    $app.onAnimeEntryLibraryDataRequested((e) => {
        console.log("[TMDb] onAnimeEntryLibraryDataRequested fired")
        console.log("[TMDb] Entry:", e.entry?.media?.id)
        console.log("[TMDb] Files:", e.entryLocalFiles?.length || 0)
        e.next()
    })
    
    $app.onAnimeEntriesLibraryDataRequested((e) => {
        console.log("[TMDb] onAnimeEntriesLibraryDataRequested fired with", e.entries?.length, "entries")
        e.next()
    })
    
    $app.onGetAnimeEntry((e) => {
        console.log("[TMDb] onGetAnimeEntry fired")
        console.log("[TMDb] Entry media ID:", e.entry?.media?.id)
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
