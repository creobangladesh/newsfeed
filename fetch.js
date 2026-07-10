const Parser = require('rss-parser');
const fs = require('fs');

const parser = new Parser({
    customFields: {
        item: [
            ['media:content', 'mediaContent'],
            ['media:thumbnail', 'mediaThumbnail'],
            ['content:encoded', 'contentEncoded'],
            ['description', 'description']
        ]
    }
});

const feeds = [
    { id: 'Bangladesh', url: 'https://www.tbsnews.net/bangladesh/rss.xml', color: '#0288d1', bg: '#e1f5fe', icon: '🇧🇩' },
    { id: 'Economy', url: 'https://www.tbsnews.net/economy/rss.xml', color: '#2e7d32', bg: '#e8f5e9', icon: '📈' },
    { id: 'Health', url: 'https://www.tbsnews.net/bangladesh/health/rss.xml', color: '#c2185b', bg: '#fce4ec', icon: '🏥' },
    { id: 'Market', url: 'https://www.tbsnews.net/markets/rss.xml', color: '#7b1fa2', bg: '#f3e5f5', icon: '📊' },
    { id: 'Education', url: 'https://www.tbsnews.net/bangladesh/education/rss.xml', color: '#e65100', bg: '#fff3e0', icon: '🎓' },
    { id: 'Banking', url: 'https://www.tbsnews.net/economy/banking/rss.xml', color: '#00796b', bg: '#e0f2f1', icon: '🏦' },
    { id: 'Tech', url: 'https://www.tbsnews.net/tech/rss.xml', color: '#1976d2', bg: '#e3f2fd', icon: '💻' },
    { id: 'Thoughts', url: 'https://www.tbsnews.net/thoughts/rss.xml', color: '#455a64', bg: '#eceff1', icon: '💭' },
    { id: 'Industry', url: 'https://www.tbsnews.net/economy/industry/rss.xml', color: '#f57c00', bg: '#fff3e0', icon: '🏭' },
    { id: 'Analysis', url: 'https://www.tbsnews.net/analysis/rss.xml', color: '#5d4037', bg: '#efebe9', icon: '🔍' }
];

// UPDATED: 120 hours (5 days)
const FRESHNESS_HOURS = 120; 
const TIME_LIMIT = Date.now() - (FRESHNESS_HOURS * 60 * 60 * 1000);
const seenLinks = new Set(); 

async function fetchAllNews() {
    let allNews = [];

    for (const feed of feeds) {
        try {
            const parsedFeed = await parser.parseURL(feed.url);
            let feedItemCount = 0; 
            
            for (const item of parsedFeed.items) {
                // UPDATED: Allow up to 25 items per category so we have plenty of history
                if (feedItemCount >= 25) break; 
                if (seenLinks.has(item.link)) continue;
                
                const itemDate = new Date(item.pubDate || item.isoDate).getTime();
                if (itemDate < TIME_LIMIT) continue;

                seenLinks.add(item.link);
                feedItemCount++; 

                let imageUrl = null;
                if (item.enclosure && item.enclosure.url) imageUrl = item.enclosure.url;
                else if (item.mediaContent && item.mediaContent['$'] && item.mediaContent['$'].url) imageUrl = item.mediaContent['$'].url;
                else if (item.mediaThumbnail && item.mediaThumbnail['$'] && item.mediaThumbnail['$'].url) imageUrl = item.mediaThumbnail['$'].url;
                
                if (!imageUrl) {
                    const combinedText = (item.content || '') + ' ' + (item.contentEncoded || '') + ' ' + (item.description || '');
                    const imgMatch = combinedText.match(/<img[^>]+src=['"]([^'"]+)['"]/i);
                    if (imgMatch) imageUrl = imgMatch[1];
                }

                if (!imageUrl) {
                    try {
                        const response = await fetch(item.link);
                        const html = await response.text();
                        const ogMatch = html.match(/<meta[^>]+property=['"]og:image['"][^>]+content=['"]([^'"]+)['"]/i);
                        if (ogMatch) imageUrl = ogMatch[1];
                    } catch (e) {
                        // ignore fetch errors
                    }
                }

                allNews.push({
                    title: item.title,
                    link: item.link,
                    pubDate: item.pubDate || item.isoDate,
                    category: feed.id,
                    color: feed.color,
                    bg: feed.bg,
                    icon: feed.icon,
                    image: imageUrl 
                    snippet: item.contentSnippet || item.description || '' // Add this line
                });
            }
        } catch (error) {
            console.error(`Error fetching ${feed.id}:`, error.message);
        }
    }

    allNews.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    const output = { news: allNews, updatedAt: new Date().toISOString() };
    fs.writeFileSync('data.json', JSON.stringify(output, null, 2));
}

fetchAllNews();
