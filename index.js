const axios = require("axios");
require("dotenv").config();

const API_KEY = process.env.API_KEY;
const CX_ID = process.env.CX_ID;
let query = "aadhar card india";

const search_url = `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${CX_ID}&q=${query}`;
let urlsArray = [];

axios
  .get(search_url)
  .then((response) => {
    if (!response.data.items) throw new Error("No search results found.");

    response.data.items.forEach((item) => urlsArray.push(item.link));

    console.log("Retrieved URLs:", urlsArray);

    // urlsArray =
    console.log("\n\n-------------------------------------------------------");
    urlsArray = getUniqueDomains(urlsArray);
    console.log("After removing duplicates...");

    return checkWebsites(urlsArray);
  })
  .then((results) => {
    console.log("\n\n-------------------------------------------------------");
    console.log("Website Check Results:");
    results.forEach((result) => {
      console.log(
        `${result.url} -> ${result.status} (HTTP ${result.statusCode}) | ${result.category}`
      );
    });

    results = removeNotWorkingUrls(results);
    results = sortWebsites(results);

    console.log("\n\n-------------------------------------------------------");
    console.log("Final Processed Results:");
    results.forEach((result) => {
      console.log(
        `${result.url} -> ${result.status} (HTTP ${result.statusCode}) | ${result.category}`
      );
    });

    console.log("\n\n-------------------------------------------------------");
    console.log("Top 2 Working URLs:");
    results.slice(0, 2).forEach((result) => {
      console.log(
        `${result.url} -> ${result.status} (HTTP ${result.statusCode}) | ${result.category}`
      );
    });
  })
  .catch((error) => {
    console.error(
      "Error occurred:",
      error.response ? error.response.data : error.message
    );
  });

function getUniqueDomains(urls) {
  const uniqueDomains = new Set();
  return urls.filter((url) => {
    try {
      let domain = new URL(url).hostname; // Extracts the domain
      if (!uniqueDomains.has(domain)) {
        uniqueDomains.add(domain);
        return true; // Keep only the first occurrence of a domain
      }
    } catch (error) {
      console.error("Invalid URL:", url);
    }
    return false;
  });
}

function isGovWebsite(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.endsWith("gov.in") || hostname.endsWith("nic.in")) {
      return { priority: 1, category: "Government" };
    } else if (hostname.endsWith("ac.in")) {
      return { priority: 2, category: "Government" };
    } else if (hostname.endsWith("com")) {
      return { priority: 3, category: "Can or Cannot be Govt" };
    } else {
      return { priority: 4, category: "Non Govt" };
    }
  } catch (error) {
    console.error("Error parsing URL:", url, error);
    return { priority: 5, category: "Error" };
  }
}

async function checkWebsites(urls) {
  return Promise.all(
    urls.map(async (url) => {
      try {
        const headResponse = await fetch(url, {
          method: "HEAD",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0 Safari/537.36",
          },
        });

        if (!headResponse.ok) throw new Error("HEAD request failed");

        const isGov = isGovWebsite(url);
        return {
          url,
          status: "Working",
          statusCode: headResponse.status,
          category: isGov.category,
          priority: isGov.priority,
        };
      } catch (error) {
        try {
          const getResult = await sendGetRequest(url);
          const isGov = isGovWebsite(url);
          return {
            url,
            status: getResult.status,
            statusCode: getResult.statusCode,
            category: isGov.category,
            priority: isGov.priority,
          };
        } catch (err) {
          const isGov = isGovWebsite(url);
          return {
            url,
            status: "Error",
            error: err.message,
            category: isGov.category,
            priority: isGov.priority,
          };
        }
      }
    })
  );
}

async function sendGetRequest(url) {
  try {
    const getResponse = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0 Safari/537.36",
      },
    });
    return {
      status: getResponse.ok ? "Working" : "Not Working",
      statusCode: getResponse.status,
    };
  } catch (error) {
    return { status: "Error", error: error.message };
  }
}

function sortWebsites(results) {
  return results.sort((a, b) => a.priority - b.priority);
}

function removeNotWorkingUrls(results) {
  return results.filter((result) => result.status === "Working");
}
