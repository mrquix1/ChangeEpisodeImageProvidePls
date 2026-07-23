/// <reference path="./plugin.d.ts" />
/// <reference path="./system.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./core.d.ts" />

const TMDB_API_KEY = "1a1c34ba2f8d63191cd5b163d74d1c52"
const TMDB_BASE_URL = "https://api.themoviedb.org/3"
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original"

let imageCache = {}

function init() {
    console.log("[TMDb] ===== FINAL VERSION LOADED =====")
    
    $app.onGetAnimeCollection((e) => {
        console.log("[TMDb] onGetAnimeCollection FIRED")
        processAndReplace(e)
    })
    
    $app.onGetRawAnimeCollection((e) => {
        console.log("[TMDb] onGetRawAnimeCollection FIRED")
        processAndReplace(e)
    })

    $ui.register((ctx) => {
        console.log("[TMDb] UI Context - Invalidating all queries")
        
        try {
            // Invalidate ALL anime collection related queries
            $app.invalidateClientQuery([
                "GetAnimeCollection",
                "GetRawAnimeCollection", 
                "GetAnimeCollectionByStatus",
                "GetAnimeCollectionManagementRelations"
            ])
            console.log("[TMDb] Query invalidation SUCCESSFUL")
        } catch (err) {
            console.error("[TMDb] Query invalidation error:", err)
        }
    })
    
    console.log("[TMDb] ===== FINAL VERSION READY =====")
}

function processAndReplace(e) {
    if (!e.animeCollection) {
        console.log("[TMDb] No collection")
        e.next()
        return
    }
    
    let lists = null
    
    // Try to find lists in various possible locations
    if (e.animeCollection.mediaListCollection?.lists) {
        lists = e.animeCollection.mediaListCollection.lists
    } else if (e.animeCollection.lists) {
        lists = e.animeCollection.lists
    } else if (Array.isArray(e.animeCollection)) {
        lists = e.animeCollection
    }
    
    if (!lists || lists.length === 0) {
        console.log("[TMDb] No lists found")
        e.next()
        return
    }
    
    console.log("[TMDb] Processing", lists.length, "lists")
    
    let totalReplaced = 0
    
    for (let i = 0; i < lists.length; i++) {
        const list = lists[i]
        if (!list) continue
        
        let entries = null
        
        // Find entries in various possible locations
        if (list.entries) {
            entries = list.entries
        } else if (list.mediaListCollection?.lists) {
            entries = list.mediaListCollection.lists
        }
        
        if (!entries || entries.length === 0) continue
        
        console.log("[TMDb] List", i, "has", entries.length, "entries")
        
        for (let j = 0; j < entries.length; j++) {
            const entry = entries[j]
            
            // Skip if no entry or media
            if (!entry || !entry.media) continue
            
            const mediaId = entry.media.id
            const currentBanner = entry.media.bannerImage
            
            // Only process TheTVDB images
            if (currentBanner && currentBanner.includes("thetvdb")) {
                console.log("[TMDb] Media", mediaId, "- Found TheTVDB, fetching TMDb...")
                
                const tmdbImage = getTmdbImage(mediaId)
                
                if (tmdbImage) {
                    console.log("[TMDb] Media", mediaId, "- REPLACING image")
                    entry.media.bannerImage = tmdbImage
                    totalReplaced++
                } else {
                    console.log("[TMDb] Media", mediaId, "- No TMDb image found")
                }
            }
        }
    }
    
    console.log("[TMDb] ===== REPLACED", totalReplaced, 'IMAGES =====')
    e.next()
}

function getTmdbImage(anilistId) {
    // Check cache first
    if (imageCache[anilistId]) {
        return imageCache[anilistId]
    }
    
    try {
        const url = `${TMDB_BASE_URL}/find/${anilistId}?api_key=${TMDB_API_KEY}&external_source=anilist_id`
        const response = fetch(url)
        
        if (response && response.tv_results && response.tv_results.length > 0) {
            const show = response.tv_results[0]
            
            if (show.backdrop_path) {
                const imageUrl = TMDB_IMAGE_BASE_URL + show.backdrop_path
                imageCache[anilistId] = imageUrl
                console.log("[TMDb] Cached image for", anilistId)
                return imageUrl
            }
        }
        
        return null
    } catch (error) {
        console.error("[TMDb] Fetch error for", anilistId, ":", error)
        return null
    }
}
