/// <reference path="./plugin.d.ts" />
/// <reference path="./system.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./core.d.ts" />

const TMDB_API_KEY = "1a1c34ba2f8d63191cd5b163d74d1c52"
const TMDB_BASE_URL = "https://api.themoviedb.org/3"
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original"

function init() {
    console.log("[TMDb] ========== INIT START ==========")
    console.log("[TMDb] API Key configured:", TMDB_API_KEY ? "YES" : "NO")
    
    // Test all possible hooks
    console.log("[TMDb] Registering all hooks...")
    
    $app.onGetAnimeCollection((e) => {
        console.log("[TMDb] *** onGetAnimeCollection FIRED ***")
        debugEvent(e, "onGetAnimeCollection")
        e.next()
    })
    
    $app.onGetRawAnimeCollection((e) => {
        console.log("[TMDb] *** onGetRawAnimeCollection FIRED ***")
        debugEvent(e, "onGetRawAnimeCollection")
        e.next()
    })
    
    $app.onScanCompleted((e) => {
        console.log("[TMDb] *** onScanCompleted FIRED ***")
        e.next()
    })
    
    $app.onAnimeEntryLibraryDataRequested((e) => {
        console.log("[TMDb] *** onAnimeEntryLibraryDataRequested FIRED ***")
        console.log("[TMDb] Entry ID:", e.entry?.media?.id)
        console.log("[TMDb] Files count:", e.entryLocalFiles?.length)
        e.next()
    })
    
    $ui.register((ctx) => {
        console.log("[TMDb] *** UI CONTEXT REGISTERED ***")
        console.log("[TMDb] ctx type:", typeof ctx)
        console.log("[TMDb] ctx keys:", Object.keys(ctx || {}))
        
        // Try to access collection via ctx
        if (ctx && typeof ctx === 'object') {
            console.log("[TMDb] Checking ctx for collection access...")
            
            // Check if we can get data somehow
            try {
                console.log("[TMDb] ctx.store exists:", !!ctx.store)
                console.log("[TMDb] ctx.screen exists:", !!ctx.screen)
            } catch (err) {
                console.error("[TMDb] Error checking ctx:", err)
            }
        }
        
        console.log("[TMDb] UI Context setup complete")
    })
    
    console.log("[TMDb] ========== INIT COMPLETE ==========")
}

function debugEvent(e, hookName) {
    console.log(`[TMDb] === Debugging ${hookName} ===`)
    console.log("[TMDb] Event object keys:", Object.keys(e || {}))
    
    if (!e) {
        console.log("[TMDb] Event is null/undefined!")
        return
    }
    
    // Check animeCollection
    console.log("[TMDb] e.animeCollection:", !!e.animeCollection)
    console.log("[TMDb] e.animeCollection type:", typeof e.animeCollection)
    
    if (e.animeCollection) {
        console.log("[TMDb] animeCollection keys:", Object.keys(e.animeCollection))
        console.log("[TMDb] animeCollection.mediaListCollection:", !!e.animeCollection.mediaListCollection)
        console.log("[TMDb] animeCollection type:", typeof e.animeCollection)
        
        if (e.animeCollection.mediaListCollection) {
            const mlc = e.animeCollection.mediaListCollection
            console.log("[TMDb] mediaListCollection keys:", Object.keys(mlc))
            console.log("[TMDb] lists exists:", !!mlc.lists)
            console.log("[TMDb] lists type:", typeof mlc.lists)
            
            if (mlc.lists) {
                console.log("[TMDb] lists length:", mlc.lists.length)
                console.log("[TMDb] lists is array:", Array.isArray(mlc.lists))
                
                if (mlc.lists.length > 0) {
                    console.log("[TMDb] First list keys:", Object.keys(mlc.lists[0] || {}))
                    console.log("[TMDb] First list entries:", !!mlc.lists[0]?.entries)
                    console.log("[TMDb] First list entries length:", mlc.lists[0]?.entries?.length)
                    
                    if (mlc.lists[0]?.entries?.length > 0) {
                        const firstEntry = mlc.lists[0].entries[0]
                        console.log("[TMDb] First entry keys:", Object.keys(firstEntry || {}))
                        console.log("[TMDb] First entry media:", !!firstEntry?.media)
                        console.log("[TMDb] First entry media keys:", Object.keys(firstEntry?.media || {}))
                        console.log("[TMDb] First entry banner:", firstEntry?.media?.bannerImage?.substring(0, 80) || "NONE")
                        
                        // TRY TO MODIFY
                        if (firstEntry?.media?.bannerImage?.includes("thetvdb")) {
                            console.log("[TMDb] *** FOUND TheTVDB IMAGE - ATTEMPTING MODIFICATION ***")
                            console.log("[TMDb] Original:", firstEntry.media.bannerImage)
                            firstEntry.media.bannerImage = "https://test-replacement.jpg"
                            console.log("[TMDb] After modification:", firstEntry.media.bannerImage)
                        }
                    }
                } else {
                    console.log("[TMDb] Lists array is empty")
                }
            } else {
                console.log("[TMDb] Lists is null/undefined/not iterable")
            }
        } else {
            console.log("[TMDb] mediaListCollection is null/undefined")
        }
    } else {
        console.log("[TMDb] animeCollection is null/undefined")
    }
    
    console.log(`[TMDb] === End ${hookName} ===`)
}
