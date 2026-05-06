import { existsSync } from "node:fs";
import { readJsonFile, writeJsonFile, writeTsvFile } from "../ioUtil.js";

const HYPIXEL_ITEMS_URL = "https://api.hypixel.net/v2/resources/skyblock/items";
const HYPIXEL_PRICES_URL = "https://api.hypixel.net/v2/skyblock/bazaar";

const ITEMS_JSON_PATH = "data/items.json";
const ITEMS_TABLE_PATH = "data/items.tsv";
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

async function fetchItems() {
    const result = {
        timeStamp: new Date().toISOString(),
        items: []
    };

    const itemsRes = await fetch(HYPIXEL_ITEMS_URL);
    const itemsObject = await itemsRes.json();

    if (!itemsObject.success) {
        console.error("Fetch official items usuccessful");
        return;
    }

    result.items = itemsObject.items;
    return result;
}

async function fetchPrices() {
    const result = {
        timeStamp: new Date().toISOString(),
        prices: []
    };

    const pricesRes = await fetch(HYPIXEL_PRICES_URL);
    const pricesObject = await pricesRes.json();

    if (!pricesObject.success) {
        console.error("Fetch official prices usuccessful");
        return;
    }

    for (const id in pricesObject.products) {
        result.prices.push(pricesObject.products[id].quick_status);
    }

    return result;
}

const args = parseCmdArgs();

let itemsObject;
let pricesObject;
if ("fetchAll" in args || !existsSync(ITEMS_JSON_PATH)) {
    itemsObject = await fetchItems();
    await writeJsonFile(itemsObject, ITEMS_JSON_PATH);

    pricesObject = await fetchPrices();
    await writeJsonFile(pricesObject, PRICES_JSON_PATH);
} else {
    itemsObject = await readJsonFile(ITEMS_JSON_PATH);
    pricesObject = await readJsonFile(PRICES_JSON_PATH);
}

writeTsvFile(itemsObject.items, ITEMS_TABLE_PATH);
writeTsvFile(pricesObject.prices, PRICES_TABLE_PATH);
