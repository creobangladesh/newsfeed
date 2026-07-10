const Parser = require('rss-parser');
const fs = require('fs');

const feeds = require('./feeds.json');

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

const FRESHNESS_HOURS = 120; 
const TIME_LIMIT = Date.now() - (FRESHNESS_HOURS * 60 * 60 * 1000);
const seenLinks = new Set(); 

function getCleanSnippet(item) {
    let raw = item.contentSnippet || item.description || item.contentEncoded || '';
    let cleanText = raw.replace(/<[^>]*>?/gm, '').trim();
    cleanText = cleanText.replace(/\s+/g, ' ');
    if (cleanText.length > 250) {
        return cleanText.substring(0, 250) + '...';
    }
    return cleanText;
}

async function fetchAllNews() {
    let allNews = [];

    for (const feed of feeds) {
        try {
            const parsedFeed = await parser.parseURL(feed.url);
            let feedItemCount = 0; 
            
            for (const item of parsedFeed.items) {
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

                allNews.push({
                    title: item.title,
                    link: item.link,
                    pubDate: item.pubDate || item.isoDate,
                    category: feed.id,
                    color: feed.color,
                    bg: feed.bg,
                    icon: feed.icon,
                    image: imageUrl,
                    snippet: getCleanSnippet(item)
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
