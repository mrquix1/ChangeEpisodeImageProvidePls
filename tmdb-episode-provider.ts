/// <reference path="./plugin.d.ts" />
/// <reference path="./system.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./core.d.ts" />

const TMDB_API_KEY = "1a1c34ba2f8d63191cd5b163d74d1c52"
const TMDB_BASE_URL = "https://api.themoviedb.org/3"
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original"

function init() {
    console.log("[TMDb] INIT START")
    
    $app.onGetAnimeCollection((e) => {
        console.log("[TMDb] onGetAnimeCollection FIRED")
        
        if (!e.animeCollection) {
            console.log("[TMDb] animeCollection is NULL")
            e.next()
            return
        }
        
        console.log("[TMDb] animeCollection KEYS:", Object.keys(e.animeCollection))
        console.log("[TMDb] animeCollection type:", typeof e.animeCollection)
        
        // Check all possible property names
        console.log("[TMDb] mediaListCollection:", !!e.animeCollection.mediaListCollection)
        console.log("[TMDb] MediaListCollection:", !!e.animeCollection.MediaListCollection)
        console.log("[TMDb] lists:", !!e.animeCollection.lists)
        console.log("[TMDb] entries:", !!e.animeCollection.entries)
        
        // Try to find lists anywhere
        let lists = null
        if (e.animeCollection.mediaListCollection?.lists) {
            lists = e.animeCollection.mediaListCollection.lists
            console.log("[TMDb] Found lists in mediaListCollection")
        } else if (e.animeCollection.lists) {
            lists = e.animeCollection.lists
            console.log("[TMDb] Found lists directly in animeCollection")
        } else if (Array.isArray(e.animeCollection)) {
            lists = e.animeCollection
            console.log("[TMDb] animeCollection IS an array!")
        }
        
        if (lists && lists.length > 0) {
            console.log("[TMDb] SUCCESS! Found lists with", lists.length, "items")
            processLists(lists)
        } else {
            console.log("[TMDb] No lists found anywhere")
        }
        
        e.next()
    })

    $ui.register((ctx) => {
        console.log("[TMDb] UI REGISTERED")
    })
    
    console.log("[TMDb] INIT COMPLETE")
}

function processLists(lists) {
    let replacedCount = 0
    
    for (let i = 0; i < lists.length; i++) {
        const list = lists[i]
        if (!list) continue
        
        console.log(`[TMDb] List ${i} keys:`, Object.keys(list))
        
        let entries = null
        if (list.entries) {
            entries = list.entries
        } else if (list.mediaListCollection?.lists) {
            entries = list.mediaListCollection.lists
        }
        
        if (!entries) continue
        
        console.log(`[TMDb] List ${i}: ${entries.length} entries`)
        
        for (let j = 0; j < entries.length; j++) {
            const entry = entries[j]
            if (!entry || !entry.media) continue
            
            const banner = entry.media.bannerImage
            if (banner && banner.includes("thetvdb")) {
                console.log(`[TMDb] FOUND TheTVDB for ${entry.media.id}`)
                
                const newImage = getTmdbImage(entry.media.id)
                if (newImage) {
                    entry.media.bannerImage = newImage
                    replacedCount++
                    console.log(`[TMDb] REPLACED`)
                }
            }
        }
    }
    
    console.log(`[TMDb] TOTAL REPLACED: ${replacedCount}`)
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
