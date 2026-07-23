/// <reference path="./plugin.d.ts" />
/// <reference path="./system.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./core.d.ts" />

const TMDB_API_KEY = "1a1c34ba2f8d63191cd5b163d74d1c52"
const TMDB_BASE_URL = "https://api.themoviedb.org/3"
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original"

function init() {
    console.log("[TMDb] ========== INIT START ==========")
    console.log("[TMDb] API Key configured: YES")
    
    $app.onGetAnimeCollection((e) => {
        console.log("[TMDb] *** onGetAnimeCollection FIRED ***")
        
        if (!e.animeCollection) {
            console.log("[TMDb] animeCollection is null/undefined")
            e.next()
            return
        }
        
        console.log("[TMDb] animeCollection exists!")
        
        const mediaListCollection = e.animeCollection.mediaListCollection
        if (!mediaListCollection) {
            console.log("[TMDb] mediaListCollection is null/undefined")
            e.next()
            return
        }
        
        console.log("[TMDb] mediaListCollection exists!")
        
        const lists = mediaListCollection.lists
        if (!lists) {
            console.log("[TMDb] lists is null/undefined")
            e.next()
            return
        }
        
        console.log("[TMDb] lists exists! Length:", lists.length)
        
        if (lists.length === 0) {
            console.log("[TMDb] lists array is EMPTY")
            e.next()
            return
        }
        
        console.log("[TMDb] Processing lists...")
        let replacedCount = 0
        
        for (let i = 0; i < lists.length; i++) {
            const list = lists[i]
            if (!list || !list.entries) continue
            
            console.log(`[TMDb] List ${i}: ${list.entries.length} entries`)
            
            for (let j = 0; j < list.entries.length; j++) {
                const entry = list.entries[j]
                if (!entry || !entry.media) continue
                
                const mediaId = entry.media.id
                const banner = entry.media.bannerImage
                
                if (banner && banner.includes("thetvdb")) {
                    console.log(`[TMDb] *** FOUND TheTVDB BANNER for ${mediaId} ***`)
                    console.log(`[TMDb] Original: ${banner.substring(0, 60)}...`)
                    
                    const newImage = getTmdbImage(mediaId)
                    if (newImage) {
                        console.log(`[TMDb] *** REPLACING with TMDb image ***`)
                        entry.media.bannerImage = newImage
                        console.log(`[TMDb] New: ${newImage.substring(0, 60)}...`)
                        replacedCount++
                    } else {
                        console.log(`[TMDb] No TMDb image found`)
                    }
                }
            }
        }
        
        console.log(`[TMDb] *** REPLACED ${replacedCount} BANNERS ***`)
        e.next()
    })
    
    $app.onGetRawAnimeCollection((e) => {
        console.log("[TMDb] *** onGetRawAnimeCollection FIRED ***")
        e.next()
    })

    $ui.register((ctx) => {
        console.log("[TMDb] *** UI CONTEXT REGISTERED ***")
    })
    
    console.log("[TMDb] ========== INIT COMPLETE ==========")
}

function getTmdbImage(anilistId) {
    try {
        const url = `${TMDB_BASE_URL}/find/${anilistId}?api_key=${TMDB_API_KEY}&external_source=anilist_id`
        const response = fetch(url)
        
        if (response && response.tv_results && response.tv_results.length > 0) {
            const show = response.tv_results[0]
            if (show.backdrop_path) {
                return TMDB_IMAGE_BASE_URL + show.backdrop_path
            }
        }
    } catch (error) {
        console.error(`[TMDb] Fetch error:`, error)
    }
    
    return null
}
