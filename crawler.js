const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const express = require('express');
const archiver = require('archiver');

const app = express();
app.use(express.json());

const visitedUrls = new Set();

const OUTPUT_DIR = path.join(__dirname, 'public', 'crawled-data');
const ZIP_FILE_NAME = 'crawled_data.zip';
const ZIP_FILE_PATH = path.join(OUTPUT_DIR, ZIP_FILE_NAME);
const SERVER_PORT = 3000;

const sanitizeFileName = (url) => url
  .replace(/^https?:\/\//, '')
  .replace(/[^a-zA-Z0-9-_]/g, '_');

const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const saveContentAndMetadata = (url, content, outputDir) => {
  ensureDirectoryExists(outputDir);

  const sanitizedFileName = sanitizeFileName(url);
  const contentFilePath = path.join(outputDir, `${sanitizedFileName}.txt`);
  const metadataFilePath = path.join(outputDir, `${sanitizedFileName}.metadata.json`);

  const metadata = generateMetadata(url);

  fs.writeFileSync(contentFilePath, content, 'utf8');
  fs.writeFileSync(metadataFilePath, JSON.stringify(metadata, null, 2), 'utf8');

  console.log(`Saved content and metadata for: ${url}`);
  return [contentFilePath, metadataFilePath];
};

const generateMetadata = (url) => {
  const urlParts = url.replace(/^https?:\/\//, '').split('/').filter(Boolean);

  return {
    metadataAttributes: {
      url,
      sub_cate_1: urlParts[0] || "",
      sub_cate_2: urlParts[1] || "",
      sub_cate_3: urlParts[2] || "",
      sub_cate_4: urlParts[3] || "",
      sub_cate_5: urlParts[4] || "",
    },
  };
};

const isBlacklisted = (url, blacklist) => blacklist.some((blacklistedUrl) => url.startsWith(blacklistedUrl));

const processUrl = async (url, depth, maxDepth, browser, baseUrl, blacklist, outputDir, tags, files) => {
  if (depth > maxDepth || visitedUrls.has(url) || isBlacklisted(url, blacklist)) return;

  visitedUrls.add(url);
  console.log(`Crawling ${url}`);

  const page = await browser.newPage();
  page.setDefaultTimeout(60000);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    const content = await page.evaluate((tags) => {
      return tags
        .flatMap(tag => Array.from(document.querySelectorAll(tag)))
        .map(el => el.innerText.trim())
        .filter(Boolean)
        .join('\n\n');
    }, tags);

    if (content) {
      const [contentFilePath, metadataFilePath] = saveContentAndMetadata(url, content, outputDir);
      files.push(contentFilePath, metadataFilePath);
    } else {
      console.warn(`No content found for: ${url}`);
    }

    const links = await page.evaluate((baseUrl) => {
      return Array.from(document.querySelectorAll('a[href]'))
        .map(a => a.href)
        .filter(href => href.startsWith(baseUrl) && !href.includes('#'));
    }, baseUrl);

    for (const link of links) {
      await processUrl(link, depth + 1, maxDepth, browser, baseUrl, blacklist, outputDir, tags, files);
    }
  } catch (error) {
    console.error(`Error processing URL ${url}:`, error.message);
  } finally {
    await page.close();
  }
};

app.post('/api/crawl', async (req, res) => {
  const { url, maxDepth, blacklist = [], tags} = req.body;

  if (!url) {
    return res.status(400).json({ error: 'Missing required parameter: url.' });
  }

  if (!maxDepth || typeof maxDepth !== 'number' || maxDepth <= 0) {
    return res.status(400).json({ error: 'Invalid or missing parameter: maxDepth. It must be a positive number.' });
  }

  if (!tags || !Array.isArray(tags) || tags.length === 0) {
    return res.status(400).json({ error: 'Invalid or missing parameter: tags. It must be a non-empty array.' });
  }

  ensureDirectoryExists(OUTPUT_DIR);

  try {
    const files = [];
    const browser = await puppeteer.launch({ headless: true, timeout: 60000 });

    await processUrl(url, 1, maxDepth, browser, url, blacklist, OUTPUT_DIR, tags, files);
    await browser.close();

    const archive = archiver('zip', { zlib: { level: 9 } });
    const output = fs.createWriteStream(ZIP_FILE_PATH);

    archive.pipe(output);
    files.forEach(file => archive.file(file, { name: path.basename(file) }));
    await archive.finalize();

    res.status(200).json({ message: 'Crawl completed', downloadUrl: `/public/crawled-data/${ZIP_FILE_NAME}` });
  } catch (error) {
    console.error('Error during crawling:', error.message);
    res.status(500).json({ error: 'An error occurred during the crawling process.' });
  }
});

app.use('/public', express.static(path.join(__dirname, 'public')));

app.listen(SERVER_PORT, () => {
  console.log(`Server is running on http://localhost:${SERVER_PORT}`);
});
