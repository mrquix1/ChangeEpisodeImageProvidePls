/// <reference path="./plugin.d.ts" />
/// <reference path="./system.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./core.d.ts" />

const TMDB_API_KEY = "1a1c34ba2f8d63191cd5b163d74d1c52"
const TMDB_BASE_URL = "https://api.themoviedb.org/3"
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original"

function init() {
    $app.onGetAnimeCollection((e) => {
        if (!e.animeCollection) {
            e.next()
            return
        }
        
        let lists = null
        if (e.animeCollection.mediaListCollection?.lists) {
            lists = e.animeCollection.mediaListCollection.lists
        } else if (e.animeCollection.lists) {
            lists = e.animeCollection.lists
        } else if (Array.isArray(e.animeCollection)) {
            lists = e.animeCollection
        }
        
        if (lists && lists.length > 0) {
            processLists(lists)
        }
        
        e.next()
    })

    $ui.register((ctx) => {
        // Invalidate queries to force UI refresh
        try {
            $app.invalidateClientQuery(["GetAnimeCollection", "GetRawAnimeCollection"])
        } catch (err) {
            // Silent
        }
    })
}

function processLists(lists) {
    for (let i = 0; i < lists.length; i++) {
        const list = lists[i]
        if (!list) continue
        
        let entries = null
        if (list.entries) {
            entries = list.entries
        } else if (list.mediaListCollection?.lists) {
            entries = list.mediaListCollection.lists
        }
        
        if (!entries) continue
        
        for (let j = 0; j < entries.length; j++) {
            const entry = entries[j]
            if (!entry || !entry.media) continue
            
            const banner = entry.media.bannerImage
            if (banner && banner.includes("thetvdb")) {
                const newImage = getTmdbImage(entry.media.id)
                if (newImage) {
                    entry.media.bannerImage = newImage
                }
            }
        }
    }
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
        // Silent
    }
    
    return null
}
