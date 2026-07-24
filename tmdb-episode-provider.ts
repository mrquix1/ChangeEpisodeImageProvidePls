/// <reference path="./plugin.d.ts" />
/// <reference path="./system.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./core.d.ts" />

const TMDB_API_KEY = "1a1c34ba2f8d63191cd5b163d74d1c52"
const TMDB_BASE_URL = "https://api.themoviedb.org/3"
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original"

function init() {
    console.log("[TMDb] Extension initialized with storage")
    
    $app.onGetAnimeCollection((e) => {
        console.log("[TMDb] onGetAnimeCollection FIRED")
        
        if (!e || !e.animeCollection) {
            e.next()
            return
        }
        
        let lists = null
        if (e.animeCollection.mediaListCollection?.lists) {
            lists = e.animeCollection.mediaListCollection.lists
        } else if (e.animeCollection.lists) {
            lists = e.animeCollection.lists
        }
        
        if (lists && lists.length > 0) {
            console.log("[TMDb] Processing and storing images...")
            let stored = 0
            
            for (let i = 0; i < lists.length; i++) {
                const list = lists[i]
                if (!list || !list.entries) continue
                
                for (let j = 0; j < list.entries.length; j++) {
                    const entry = list.entries[j]
                    if (!entry || !entry.media) continue
                    
                    const mediaId = entry.media.id
                    const banner = entry.media.bannerImage
                    
                    if (banner && banner.includes("thetvdb")) {
                        console.log("[TMDb] Getting TMDb image for", mediaId)
                        const newImage = getTmdbImage(mediaId)
                        
                        if (newImage) {
                            // Store in persistent storage
                            $storage.set("tmdb.image." + mediaId, newImage)
                            // Also replace in current collection
                            entry.media.bannerImage = newImage
                            stored++
                            console.log("[TMDb] Stored image for", mediaId)
                        }
                    }
                }
            }
            
            console.log("[TMDb] Stored", stored, "images in storage")
        }
        
        e.next()
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
