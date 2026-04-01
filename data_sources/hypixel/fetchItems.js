import { existsSync } from "node:fs";
import { readJsonFile, writeJsonFile, writeTsvFile } from "../ioUtil.js";

const HYPIXEL_ITEMS_URL = "https://api.hypixel.net/v2/resources/skyblock/items";

const ITEMS_JSON_PATH = "data/items.json";
const ITEMS_TABLE_PATH = "data/items.tsv";

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

const args = parseCmdArgs();

let itemsObject;
if ("fetchAll" in args || !existsSync(ITEMS_JSON_PATH)) {
    itemsObject = await fetchItems();
    await writeJsonFile(itemsObject, ITEMS_JSON_PATH);
} else {
    itemsObject = await readJsonFile(ITEMS_JSON_PATH);
}

writeTsvFile(itemsObject.items, ITEMS_TABLE_PATH);
