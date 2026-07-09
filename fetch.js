const Parser = require('rss-parser');
const fs = require('fs');

async function fetchNews() {
    const parser = new Parser();
    const feed = await parser.parseURL('https://news.tbs.co.jp/rss/index.rdf'); 
    
    const formattedNews = feed.items.map(item => ({
        title: item.title,
        link: item.link,
        pubDate: item.pubDate || item.isoDate
    }));

    const output = {
        news: formattedNews,
        updatedAt: new Date().toISOString()
    };

    // This saves the data into a file called data.json
    fs.writeFileSync('data.json', JSON.stringify(output, null, 2));
}

fetchNews();
