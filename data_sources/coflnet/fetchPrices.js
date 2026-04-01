import { existsSync } from "node:fs";
import { readJsonFile, writeJsonFile, writeTsvFile } from "../ioUtil.js";

const COFLNET_PRICES_URL = "https://sky.coflnet.com/api/prices/neu";

const PRICES_JSON_PATH = "data/prices.json";
const PRICES_TABLE_PATH = "data/prices.tsv";

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

async function fetchPrices() {
    const result = {
        timeStamp: new Date().toISOString(),
        prices: []
    };

    const pricesRes = await fetch(COFLNET_PRICES_URL);
    const pricesObject = await pricesRes.json();

    for (const id of Object.keys(pricesObject)) {
        result.prices.push({ id: id, price: pricesObject[id] });
    }

    return result;
}

const args = parseCmdArgs();

let pricesObject;
if ("fetchAll" in args || !existsSync(PRICES_JSON_PATH)) {
    pricesObject = await fetchPrices();
    await writeJsonFile(pricesObject, PRICES_JSON_PATH);
} else {
    pricesObject = await readJsonFile(PRICES_JSON_PATH);
}

writeTsvFile(pricesObject.prices, PRICES_TABLE_PATH);
