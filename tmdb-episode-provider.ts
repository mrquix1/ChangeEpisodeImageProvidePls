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
    
    // Hook into when anime collection is fetched
    $app.onGetAnimeCollection((e) => {
        console.log("[TMDb] onGetAnimeCollection triggered")
        processAnimeCollection(e.animeCollection)
        e.next()
    })
    
    // Also hook into raw collection
    $app.onGetRawAnimeCollection((e) => {
        console.log("[TMDb] onGetRawAnimeCollection triggered")
        processAnimeCollection(e.animeCollection)
        e.next()
    })

    $ui.register((ctx) => {
        console.log("[TMDb] UI context registered")
    })
}

function processAnimeCollection(collection) {
    if (!collection?.mediaListCollection?.lists?.length) {
        console.log("[TMDb] No anime collection data")
        return
    }
    
    console.log("[TMDb] Processing collection with", collection.mediaListCollection.lists.length, "lists")
    
    for (let i = 0; i < collection.mediaListCollection.lists.length; i++) {
        const list = collection.mediaListCollection.lists[i]
        if (!list?.entries?.length) continue
        
        console.log(`[TMDb] Processing list ${i} with ${list.entries.length} entries`)
        
        for (let j = 0; j < list.entries.length; j++) {
            const entry = list.entries[j]
            if (!entry?.media) continue
            
            const mediaId = entry.media.id
            
            // Replace banner image if it's from TheTVDB
            if (entry.media.bannerImage && entry.media.bannerImage.includes("thetvdb")) {
                console.log(`[TMDb] Found TheTVDB banner for media ${mediaId}`)
                const tmdbImage = getTmdbBannerImage(mediaId)
                if (tmdbImage) {
                    console.log(`[TMDb] Replacing banner with TMDb image`)
                    $replace(entry.media.bannerImage, tmdbImage)
                }
            }
            
            // Try to replace episode cover images if available
            if (entry.media.coverImage?.large && entry.media.coverImage.large.includes("thetvdb")) {
                const tmdbImage = getTmdbCoverImage(mediaId)
                if (tmdbImage) {
                    $replace(entry.media.coverImage.large, tmdbImage)
                }
            }
        }
    }
}

function getTmdbBannerImage(mediaId) {
    try {
        const cacheKey = `banner_${mediaId}`
        if (episodeImageCache[cacheKey]) {
            return episodeImageCache[cacheKey]
        }
        
        // Fetch from TMDB
        const url = `${TMDB_BASE_URL}/find/${mediaId}?api_key=${TMDB_API_KEY}&external_source=anilist_id`
        const response = fetch(url)
        
        if (response && response.tv_results && response.tv_results.length > 0) {
            const show = response.tv_results[0]
            if (show.backdrop_path) {
                const imageUrl = TMDB_IMAGE_BASE_URL + show.backdrop_path
                episodeImageCache[cacheKey] = imageUrl
                return imageUrl
            }
        }
        
        return null
    } catch (error) {
        console.error(`[TMDb] Error fetching banner:`, error)
        return null
    }
}

function getTmdbCoverImage(mediaId) {
    try {
        const cacheKey = `cover_${mediaId}`
        if (episodeImageCache[cacheKey]) {
            return episodeImageCache[cacheKey]
        }
        
        const url = `${TMDB_BASE_URL}/find/${mediaId}?api_key=${TMDB_API_KEY}&external_source=anilist_id`
        const response = fetch(url)
        
        if (response && response.tv_results && response.tv_results.length > 0) {
            const show = response.tv_results[0]
            if (show.poster_path) {
                const imageUrl = TMDB_IMAGE_BASE_URL + show.poster_path
                episodeImageCache[cacheKey] = imageUrl
                return imageUrl
            }
        }
        
        return null
    } catch (error) {
        console.error(`[TMDb] Error fetching cover:`, error)
        return null
    }
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
