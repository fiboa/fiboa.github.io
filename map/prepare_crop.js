const fs = require('fs');
const crypto = require('crypto');
const { XMLParser } = require("fast-xml-parser")

const base = "https://data.source.coop/fiboa/";
const promise = fetch(`${base}?list-type=2&prefix=data`)
  .then(response => response.text())
  .then(text => new XMLParser().parse(text))
  .then(data => data.ListBucketResult.Contents
    .filter(item => item.Key.includes("collection.json"))
    .map(async (item) => {
      const url = new URL(item.Key, base);
      try {
        console.log("Fetching " + url);
        const response = await fetch(url);
        const collection = await response.json();
        collection.source = url.href;
        return collection;
      } catch (error) {
        console.error(`Failed to load ${url}: ${error}`);
      }
    }));

promise.then(
  promises => Promise.allSettled(promises)
  .then(results => {
    results = results
      .filter(p => p.status === 'fulfilled' && p.value)
      .map(p => {
        const c = p.value;
        const data = {
          id: c.id,
          title: (c.title || "").replace('Field boundaries for ', ''),
          attribution: c.attribution,
          bbox: c.extent.spatial.bbox,
          source: c.source,
          extensions: c.vecorel_extensions?.[c.id],
        };

        const pmtiles = c.links.find(l => l.rel === 'pmtiles');
        if (pmtiles) {
          data.pmtiles = pmtiles.href;
        }

        if (c.assets) {
          const parquet = Object.values(c.assets).find(a => a.type === 'application/vnd.apache.parquet');
          if (parquet && parquet['table:row_count'] > 0) {
            data.count = parquet['table:row_count'];
          }
        } else if (c.count) {
          data.count = c.count;
        }

        return data;
      });
    fs.writeFileSync('crop/sources.js', `export default ${JSON.stringify(results, null, 2)}`);
  })
  .catch(console.error));

function strToColor(str) {
    return '#' + crypto.createHash('md5').update(str).digest('hex').substring(0, 6);
}
const hcat = fs.readFileSync('../code/hcat/HCAT3.csv', 'utf8');
const hcatMapping = hcat.split('\n').slice(1).map((line) => {
  const [name, code] = line.split(',');
  return { name, code, color: strToColor(code || "") };
});
fs.writeFileSync('crop/codes.js', `export const hcat = ${JSON.stringify(hcatMapping, null, 2)}`);
