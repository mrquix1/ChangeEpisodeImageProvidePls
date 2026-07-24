/// <reference path="./plugin.d.ts" />
/// <reference path="./system.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./core.d.ts" />

const TMDB_API_KEY = "1a1c34ba2f8d63191cd5b163d74d1c52"
const TMDB_BASE_URL = "https://api.themoviedb.org/3"
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original"

function init() {
    $ui.register((ctx) => {
        console.log("[TMDb] Initialized with maximum effort")
        
        ctx.screen.onNavigate((e) => {
            if (e.pathname === "/entry") {
                const mediaId = Number(e.searchParams.id)
                console.log("[TMDb] Entry page, mediaId:", mediaId)
                
                ctx.anime.getAnimeEntry(mediaId).then((result) => {
                    const media = result.media
                    if (!media) {
                        console.log("[TMDb] No media found")
                        return
                    }
                    
                    console.log("[TMDb] Got media, getting TMDb image")
                    const tmdbImage = getTmdbImage(mediaId)
                    
                    if (tmdbImage) {
                        console.log("[TMDb] Got TMDb image:", tmdbImage)
                        media.bannerImage = tmdbImage
                        media.coverImage = { large: tmdbImage, medium: tmdbImage }
                        
                        console.log("[TMDb] Set images, invalidating queries")
                        try {
                            $app.invalidateClientQuery(["GetAnimeEntry"])
                            $app.invalidateClientQuery(["GetAnimeCollection"])
                            console.log("[TMDb] Queries invalidated")
                        } catch (err) {
                            console.error("[TMDb] Invalidation failed:", err)
                        }
                    }
                }).catch((err) => {
                    console.error("[TMDb] Error:", err)
                })
            }
        })
    })
}

function getTmdbImage(anilistId) {
    try {
        const url = TMDB_BASE_URL + "/find/" + anilistId + "?api_key=" + TMDB_API_KEY + "&external_source=anilist_id"
        const response = fetch(url)
        
        if (response && response.tv_results && response.tv_results.length > 0) {
            const show = response.tv_results[0]
            if (show.backdrop_path) {
                const imageUrl = TMDB_IMAGE_BASE_URL + show.backdrop_path
                console.log("[TMDb] Got TMDb URL")
                return imageUrl
            }
        }
        
        console.log("[TMDb] No TMDb image found")
        return null
    } catch (error) {
        console.error("[TMDb] Fetch failed:", error)
        return null
    }
}
