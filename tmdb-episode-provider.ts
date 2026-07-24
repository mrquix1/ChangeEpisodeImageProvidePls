/// <reference path="./plugin.d.ts" />
/// <reference path="./system.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./core.d.ts" />

function init() {
    $app.onGetAnimeCollection((e) => {
        console.log("[TMDb] Hook fired")
        
        if (!e || !e.animeCollection) {
            e.next()
            return
        }
        
        let lists = e.animeCollection.lists || e.animeCollection.mediaListCollection?.lists
        
        if (lists && lists.length > 0) {
            console.log("[TMDb] Processing list")
            const list = lists[0]
            
            if (list.entries && list.entries.length > 0) {
                const entry = list.entries[0]
                console.log("[TMDb] First entry media id:", entry.media?.id)
                console.log("[TMDb] First entry banner:", entry.media?.bannerImage?.substring(0, 50))
                
                // Simple test: change first banner to a test URL
                if (entry.media) {
                    entry.media.bannerImage = "https://image.tmdb.org/t/p/original/TEST123.jpg"
                    console.log("[TMDb] TEST: Changed first banner")
                }
            }
        }
        
        e.next()
    })

    $ui.register((ctx) => {
        console.log("[TMDb] UI ready")
    })
}
