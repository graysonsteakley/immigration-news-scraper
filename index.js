const PORT = 8000;

const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const url = require("url");
const app = express();

app.get("/", (_, res) => {
  res.json("Welcome to my news scrapper API!");
});

let articles = [];
const newspapers = [
  {
    name: "boundless",
    address: "https://www.boundless.com/immigration-news",
  },
  {
    name: "nif",
    address: "https://immigrationforum.org/resources/?type=press_release",
  },
  { name: "hrf", address: "https://www.humanrightsfirst.org/press" },
];

const isValidUrl = (urlString) => {
  var urlPattern = new RegExp(
    "^(https?:\\/\\/)?" + // validate protocol
      "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" + // validate domain name
      "((\\d{1,3}\\.){3}\\d{1,3}))" + // validate OR ip (v4) address
      "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // validate port and path
      "(\\?[;&a-z\\d%_.~+=-]*)?" + // validate query string
      "(\\#[-a-z\\d_]*)?$",
    "i"
  ); // validate fragment locator
  return !!urlPattern.test(urlString);
};

app.get("/news", async (_, res) => {
  await axios
    .all(
      newspapers.map((np) =>
        axios.get(np.address, {
          params: {
            np,
          },
        })
      )
    )
    .then(
      axios.spread((...allData) => {
        allData.forEach((response) => {
          handleScrape(response, response.config.params.np);
        });
      })
    );

  res.json(articles);
});

app.get("/news/:newspaperId", async (req, res) => {
  articles = [];
  const title = req.params.newspaperId;
  const newspaper = newspapers.find((news) => news.name === title);
  await axios.get(newspaper.address).then((response) => {
    handleScrape(response, newspaper);
  });
  res.json(articles);
});

app.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
});

const handleScrape = (response, np) => {
  const html = response.data;
  const $ = cheerio.load(html);

  $('a:contains("Immigration")', html).each(function () {
    const title = $(this).text();
    let formattedURL = $(this).attr("href");
    if (!isValidUrl(formattedURL)) {
      const parsedURL = url.parse(response.config.url);
      formattedURL = parsedURL.protocol + "//" + parsedURL.host + formattedURL;
      if (!isValidUrl(formattedURL)) return;
    }
    articles.push({ title, url: formattedURL, source: np.address });
  });
};
