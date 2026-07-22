/// <reference path="./plugin.d.ts" />
/// <reference path="./system.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./core.d.ts" />

const TMDB_API_KEY = "1a1c34ba2f8d63191cd5b163d74d1c52"
const TMDB_BASE_URL = "https://api.themoviedb.org/3"
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original"

let episodeImageCache = {}

function init() {
    $app.onAnimeEntryLibraryDataRequested((e) => {
        if (e.entry && e.entry.media) {
            const tvdbId = e.entry.media.id
            
            if (e.entryLocalFiles && e.entryLocalFiles.length > 0) {
                e.entryLocalFiles.forEach((file) => {
                    const epMatch = file.match(/[Ee]p(?:isode)?[\s_-]?(\d+)/)
                    if (epMatch) {
                        const epNum = parseInt(epMatch[1])
                        const tmdbImage = getTmdbEpisodeImage(tvdbId, epNum)
                        if (tmdbImage) {
                            $storage.set(`tmdb-image_${tvdbId}_${epNum}`, tmdbImage)
                        }
                    }
                })
            }
        }
        
        e.next()
    })

    $ui.register((ctx) => {
        ctx.toast.info("TMDb Episode Provider activated")
    })
}

function getTmdbEpisodeImage(tvdbId, episodeNumber) {
    const cacheKey = `${tvdbId}_${episodeNumber}`
    if (episodeImageCache[cacheKey]) {
        return episodeImageCache[cacheKey]
    }

    try {
        const searchUrl = `${TMDB_BASE_URL}/find/${tvdbId}?api_key=${TMDB_API_KEY}&external_source=tvdb_id`
        const response = $http.get(searchUrl)
        
        if (!response || !response.tv_results || response.tv_results.length === 0) {
            return null
        }

        const tmdbShowId = response.tv_results[0].id
        const episodeUrl = `${TMDB_BASE_URL}/tv/${tmdbShowId}/season/1/episode/${episodeNumber}?api_key=${TMDB_API_KEY}`
        const episodeResponse = $http.get(episodeUrl)

        if (episodeResponse && episodeResponse.still_path) {
            const imageUrl = TMDB_IMAGE_BASE_URL + episodeResponse.still_path
            episodeImageCache[cacheKey] = imageUrl
            return imageUrl
        }

        return null
    } catch (error) {
        console.error(`Error fetching TMDb image for episode ${episodeNumber}:`, error)
        return null
    }
}
