# TMDb Episode Provider for Seanime

🎬 Automatically replaces low-quality TheTVDB episode images with higher quality versions from TMDb.

## 📊 Comparison

| TheTVDB | TMDb |
|---------|------|
| Lower resolution (400x225) | Higher resolution (1920x1080) |
| Inconsistent quality | Consistent quality |
| `artworks.thetvdb.com/banners/episodes/...` | `image.tmdb.org/t/p/original/...` |

## ✨ Features

- ✅ **Automatic replacement** - Seamlessly replaces episode images as you browse
- ✅ **Smart caching** - 24-hour cache to minimize API calls
- ✅ **Multi-query search** - Tries multiple search terms to find matches
- ✅ **UI Dashboard** - Tray plugin with cache management
- ✅ **Type-safe** - Full TypeScript support
- ✅ **Easy setup** - User-friendly API key configuration

## 📦 Installation

### Step 1: Get a TMDb API Key
1. Visit [https://www.themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)
2. Sign up for a free TMDb account (if you don't have one)
3. Request an API key (v3 auth)
4. Copy your API key

### Step 2: Install the Plugin
1. Open **Seanime**
2. Go to **Extensions** → **Add Extension**
3. Paste this URL:
   ```
   https://raw.githubusercontent.com/mrquix1/ChangeEpisodeImageProvidePls/main/tmdb-episode-provider.json
   ```
4. Click **Install**

### Step 3: Configure API Key
1. After installation, the plugin will prompt for configuration
2. Paste your TMDb API key into the **API Key** field
3. Click **Save**

### Step 4: Reload & Grant Permissions
1. Reload the extension (or restart Seanime)
2. Grant **Network Access** permission when prompted
3. The plugin is now active! ✅

## 🔧 How It Works

### Architecture
```
User browses anime details
         ↓
Plugin hooks into request
         ↓
Search for anime on TMDb using title/synonyms
         ↓
Fetch all episode data from TMDb
         ↓
Cache results (24 hours)
         ↓
Replace TheTVDB image URLs with TMDb URLs
         ↓
Display updated images
```

### Process Flow
1. **Hook** - Plugin intercepts `onAnimeDetailsRequested` event
2. **Search** - Queries TMDb API with anime title/synonyms
3. **Fetch** - Downloads all episode still images for matched show
4. **Cache** - Stores results in memory for performance
5. **Replace** - Swaps episode image URLs before display
6. **Display** - High-quality images shown in Seanime UI

## 📋 Configuration

### User Configuration
The plugin uses Seanime's user config system for the API key:

```json
{
    "userConfig": {
        "requiresConfig": true,
        "version": 1,
        "fields": [
            {
                "name": "apiKey",
                "label": "TMDb API Key",
                "type": "text"
            }
        ]
    }
}
```

### Environment Variables (Optional)
You can also hardcode the API key in the TypeScript file by replacing:
```typescript
const TMDB_API_KEY = "{{apiKey}}"
```
with:
```typescript
const TMDB_API_KEY = "your_actual_api_key_here"
```

## 🐛 Troubleshooting

### Images Still Not Showing?
- ✓ Verify your TMDb API key is correct
- ✓ Check that the anime exists on TMDb (search on [themoviedb.org](https://www.themoviedb.org))
- ✓ Ensure episode numbers match between TheTVDB and TMDb
- ✓ Check browser console for error messages
- ✓ Try clearing cache from plugin tray menu

### "Anime not found" Error
- Some anime may not exist on TMDb
- Try using the English title vs Romaji title
- Check if the anime is a seasonal series (multiple seasons)

### Rate Limiting
- TMDb API has rate limits (~40 requests/10 seconds)
- The plugin includes delays to respect rate limits
- Cache ensures repeated shows don't hit API repeatedly

### Plugin Not Loading
- Make sure you **granted network access** permissions
- Verify the API key is entered correctly
- Check Seanime version (requires plugin support)
- Try restarting Seanime

## 📊 Performance

- **First load**: ~2-5 seconds per anime (depends on episode count)
- **Subsequent loads**: Instant (from cache)
- **Cache duration**: 24 hours
- **Memory usage**: ~1-2MB per cached anime

## 🔗 API Usage

The plugin uses these TMDb API endpoints:
- `GET /search/tv` - Search for anime/shows
- `GET /tv/{id}` - Get show details (season count)
- `GET /tv/{id}/season/{season_number}` - Get episode data

All API calls include your API key.

## 📄 File Structure

```
tmdb-episode-provider/
├── tmdb-episode-provider.ts      # Main plugin code
├── tmdb-episode-provider.json    # Plugin manifest
├── core.d.ts                     # Core type definitions
├── app.d.ts                      # App type definitions
├── plugin.d.ts                   # Plugin type definitions
└── README.md                     # This file
```

## 🛠️ Development

### Building from Source
```bash
# The plugin is written in TypeScript
# Seanime will compile it automatically when loading

# To test locally:
# 1. Clone this repository
# 2. Place the manifest in your Seanime extensions folder
# 3. Set isDevelopment to true in manifest
# 4. Point payloadURI to your local file
```

### Adding Features
The plugin is designed to be extensible. Key modification points:
- `findTmdbAnimeId()` - Modify search logic
- `fetchAllEpisodeImages()` - Change image fetching
- Caching logic - Adjust cache duration/strategy
- UI tray - Add more controls/info

## 📝 License

MIT License - Feel free to fork and modify!

## 🙏 Credits

- [Seanime](https://github.com/5rahim/seanime) - Anime manager
- [TMDb](https://www.themoviedb.org/) - Episode images API
- Built with ❤️ for anime enthusiasts

## 🔗 Links

- **Repository**: https://github.com/mrquix1/ChangeEpisodeImageProvidePls
- **TMDb**: https://www.themoviedb.org/
- **Seanime**: https://seanime.rahim.app/
- **API Docs**: https://developer.themoviedb.org/docs/getting-started
