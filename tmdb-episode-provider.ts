/// <reference path="./plugin.d.ts" />
/// <reference path="./system.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./core.d.ts" />

function init() {
    $app.onAnimeMetadataRequested((e) => {
        console.log("[TMDb] Hook fired")
        console.log("[TMDb] animeMetadata:", JSON.stringify(e.animeMetadata))
        
        e.next()
    })
}
