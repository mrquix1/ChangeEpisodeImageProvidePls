/// <reference path="./plugin.d.ts" />
/// <reference path="./system.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./core.d.ts" />

const TMDB_API_KEY = "1a1c34ba2f8d63191cd5b163d74d1c52"
const TMDB_BASE_URL = "https://api.themoviedb.org/3"
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original"

let imageCache = {}

function init() {
    console.log("[TMDb] Extension starting...")
    
    // This fires when Seanime loads the raw anime collection
    $app.onGetRawAnimeCollection((e) => {
        console.log("[TMDb] ===== onGetRawAnimeCollection FIRED =====")
        
        if (!e.animeCollection) {
            console.log("[TMDb] No collection object")
            e.next()
            return
        }
        
        const lists = e.animeCollection?.mediaListCollection?.lists
        if (!lists || lists.length === 0) {
            console.log("[TMDb] No lists in collection")
            e.next()
            return
        }
        
        console.log(`[TMDb] Found ${lists.length} lists`)
        
        for (let i = 0; i < lists.length; i++) {
            const list = lists[i]
            if (!list?.entries) continue
            
            console.log(`[TMDb] List ${i}: ${list.entries.length} entries`)
            
            for (let j = 0; j < list.entries.length; j++) {
                const entry = list.entries[j]
                if (!entry?.media) continue
                
                const mediaId = entry.media.id
                const currentBanner = entry.media.bannerImage
                
                if (currentBanner && currentBanner.includes("thetvdb")) {
                    console.log(`[TMDb] Media ${mediaId}: Found TheTVDB banner`)
                    
                    // Try to get TMDb image
                    const tmdbImage = getTmdbImage(mediaId)
                    if (tmdbImage) {
                        console.log(`[TMDb] Replacing banner for ${mediaId}`)
                        entry.media.bannerImage = tmdbImage
                    }
                }
            }
        }
        
        console.log("[TMDb] ===== Collection processing complete =====")
        e.next()
    })

    $ui.register((ctx) => {
        console.log("[TMDb] UI registered")
    })
}

function getTmdbImage(anilistId) {
    const cacheKey = `img_${anilistId}`
    
    if (imageCache[cacheKey]) {
        return imageCache[cacheKey]
    }
    
    try {
        const searchUrl = `${TMDB_BASE_URL}/find/${anilistId}?api_key=${TMDB_API_KEY}&external_source=anilist_id`
        const response = fetch(searchUrl)
        
        if (response && response.tv_results && response.tv_results.length > 0) {
            const show = response.tv_results[0]
            
            if (show.backdrop_path) {
                const imageUrl = TMDB_IMAGE_BASE_URL + show.backdrop_path
                imageCache[cacheKey] = imageUrl
                return imageUrl
            }
        }
        
        return null
    } catch (error) {
        console.error(`[TMDb] Error: ${error}`)
        return null
    }
}
