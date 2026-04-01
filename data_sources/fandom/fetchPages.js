import { existsSync } from "node:fs";
import { sleep, formatUrl } from "../httpUtil.js";
import { readJsonFile, writeJsonFile, writeTsvFile } from "../ioUtil.js";
import { formatInfoboxData, normalizePageContents } from "./fandomUtil.js";
import wtf from "wtf_wikipedia";

const SLEEP_TIME = 1800;
const MAX_PAGES_REQUEST_LENGTH = 6000;
const MAX_PAGES_LENGTH = 50;

const PAGES_PATH = "data/pages.json";
const PAGES_DATA_PATH = "data/pages_data.json";
const PAGES_TABLE_PATH = "data/pages_table.tsv";

const FANDOM_API_URL = "https://hypixel-skyblock.fandom.com/api.php";

const FETCH_PAGES_QUERIES = [
    "action=query",
    "list=allpages",
    "format=json",
    "aplimit=max"
];
const FETCH_PAGES_DATA_QUERIES = [
    "action=query",
    "prop=revisions",
    "rvprop=content",
    "format=json"
];

function parseCmdArgs() {
    const result = {};

    for (const arg of process.argv) {
        switch (arg) {
            case "--fetch-all":
                result.fetchAll = true;
        }
    }

    return result;
}

async function fetchAllPages() {
    const result = {
        timeStamp: new Date().toISOString(),
        pages: [],
    };

    let next = "";
    do {
        let queries = [...FETCH_PAGES_QUERIES];

        if (next) {
            queries.push(`apcontinue=${next}`);
        }

        const url = formatUrl(FANDOM_API_URL, queries);

        console.log(`Making request to ${url}`);

        const pagesRes = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": "Flown/1.0 (flown664@gmail.com)"
            }
        });
        const pages = await pagesRes.json();

        console.log(`Received response`);

        result.pages.push(...pages.query.allpages);

        next = pages.continue?.apcontinue;

        await sleep(SLEEP_TIME);
    } while (next);

    return result;
}

async function fetchPagesData(pagesObject) {
    const result = {
        timeStamp: pagesObject.timeStamp,
        pagesData: []
    };

    for (let p = 0; p < pagesObject.pages.length;) {
        let pagesRequestLength = 1;
        let pagesRequest = pagesObject.pages[p].title;
        p++;
        if (p === pagesObject.pages.length) break;
        let nextPageId = pagesObject.pages[p].title;

        while (p < pagesObject.pages.length && pagesRequestLength < MAX_PAGES_LENGTH && pagesRequest.length + nextPageId.length + 1 <= MAX_PAGES_REQUEST_LENGTH) {
            pagesRequest += `|${nextPageId}`;

            p++;
            if (p === pagesObject.pages.length) break;

            pagesRequestLength++;
            nextPageId = pagesObject.pages[p].title;
        }

        let queries = [...FETCH_PAGES_DATA_QUERIES, `titles=${pagesRequest}`];
        const url = formatUrl(FANDOM_API_URL, queries);

        console.log(`Making request to ${url}`);

        const pagesDataRes = await fetch(url);
        const pagesData = await pagesDataRes.json();

        console.log(`Received response`);

        result.pagesData.push(...Object.values(pagesData.query.pages));

        await sleep(SLEEP_TIME);
    }

    return result;
}

function formatPagesData(pagesData) {
    const result = [];

    for (const pageData of pagesData) {
        console.log(`Parsing page ${pageData.title}`);

        if (!("revisions" in pageData)) {
            continue;
        }

        const pageContents = normalizePageContents(pageData.revisions[0]["*"]);
        const pageDoc = wtf(pageContents);

        const infoboxes = pageDoc.infoboxes();
        for (const infobox of infoboxes) {
            const data = formatInfoboxData(infobox);
            data.title = pageData.title;

            result.push(data);
        }
    }

    return result;
}

const args = parseCmdArgs();

let pagesObject;
if (!("fetchAll" in args) && existsSync(PAGES_PATH)) {
    pagesObject = await readJsonFile(PAGES_PATH);
} else {
    pagesObject = await fetchAllPages();
    writeJsonFile(pagesObject, PAGES_PATH);
}

let pagesDataObject;
if (!("fetchAll" in args) && existsSync(PAGES_DATA_PATH)) {
    pagesDataObject = await readJsonFile(PAGES_DATA_PATH);
} else {
    pagesDataObject = await fetchPagesData(pagesObject);
    writeJsonFile(pagesDataObject, PAGES_DATA_PATH);
}

const formattedData = formatPagesData(pagesDataObject.pagesData);
writeTsvFile(formattedData, PAGES_TABLE_PATH);
