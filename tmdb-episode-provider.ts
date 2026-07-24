/// <reference path="./plugin.d.ts" />
/// <reference path="./system.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./core.d.ts" />

const TMDB_API_KEY = "1a1c34ba2f8d63191cd5b163d74d1c52"
const TMDB_BASE_URL = "https://api.themoviedb.org/3"
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original"

function init() {
    $app.onGetAnimeCollection((e) => {
        try {
            console.log("[TMDb] onGetAnimeCollection FIRED")
            
            if (!e) {
                console.log("[TMDb] Event is null")
                return
            }
            
            console.log("[TMDb] Event exists, checking animeCollection")
            
            if (!e.animeCollection) {
                console.log("[TMDb] animeCollection is null")
                e.next()
                return
            }
            
            console.log("[TMDb] animeCollection exists")
            
            // Direct access attempt
            let lists = null
            try {
                if (e.animeCollection.mediaListCollection) {
                    console.log("[TMDb] Found mediaListCollection")
                    lists = e.animeCollection.mediaListCollection.lists
                }
            } catch (err) {
                console.error("[TMDb] Error accessing mediaListCollection:", err)
            }
            
            if (!lists) {
                try {
                    lists = e.animeCollection.lists
                    console.log("[TMDb] Found lists directly")
                } catch (err) {
                    console.error("[TMDb] Error accessing lists:", err)
                }
            }
            
            if (!lists) {
                console.log("[TMDb] No lists found")
                e.next()
                return
            }
            
            console.log("[TMDb] Found lists, length:", lists.length)
            
            if (lists.length > 0) {
                let replaced = 0
                
                for (let i = 0; i < lists.length; i++) {
                    try {
                        const list = lists[i]
                        if (!list) continue
                        
                        const entries = list.entries
                        if (!entries) continue
                        
                        for (let j = 0; j < entries.length; j++) {
                            try {
                                const entry = entries[j]
                                if (!entry || !entry.media) continue
                                
                                const banner = entry.media.bannerImage
                                if (banner && banner.indexOf("thetvdb") !== -1) {
                                    const newImage = getTmdbImage(entry.media.id)
                                    if (newImage) {
                                        entry.media.bannerImage = newImage
                                        replaced++
                                    }
                                }
                            } catch (err) {
                                console.error("[TMDb] Error processing entry:", err)
                            }
                        }
                    } catch (err) {
                        console.error("[TMDb] Error processing list:", err)
                    }
                }
                
                console.log("[TMDb] REPLACED", replaced, "images")
            }
            
            e.next()
        } catch (err) {
            console.error("[TMDb] Fatal error:", err)
            e.next()
        }
    })

    $ui.register((ctx) => {
        console.log("[TMDb] UI registered")
    })
}

function getTmdbImage(anilistId) {
    try {
        const url = TMDB_BASE_URL + "/find/" + anilistId + "?api_key=" + TMDB_API_KEY + "&external_source=anilist_id"
        const response = fetch(url)
        
        if (response && response.tv_results && response.tv_results.length > 0) {
            const show = response.tv_results[0]
            if (show.backdrop_path) {
                return TMDB_IMAGE_BASE_URL + show.backdrop_path
            }
        }
    } catch (error) {
        console.error("[TMDb] Fetch error:", error)
    }
    
    return null
}
