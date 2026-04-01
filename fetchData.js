import { existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";

const OFFICIAL_ITEMS_URL = "https://api.hypixel.net/v2/resources/skyblock/items";
const REPO_ITEMS_URL = "https://api.skyblockrepo.com/v1/items";
const COFL_PRICES_URL = "https://sky.coflnet.com/api/prices/neu";

const ITEMS_JSON_PATH = "items.json";
const ITEMS_TABLE_PATH = "items.tsv";
const ACCESSORY_UPGRADES_TABLE_PATH = "accessoryUpgrades.tsv";

function isObject(thing) {
    return typeof thing === "object" && thing !== undefined && !Array.isArray(thing);
}

async function readJsonFile(path) {
    return JSON.parse(await readFile(path));
}

async function writeJsonFile(json, path) {
    await writeFile(path, JSON.stringify(json));
}

async function writeTsvFile(table, path) {
    const tableKeys = Object.keys(table);
    const tableValues = Object.values(table);
    let string = `${tableKeys.join("\t")}\n`;

    for (let r = 0; r < tableValues[0].length; r++) {
        const values = [];
        for (const tableValue of tableValues) {
            let value = tableValue[r];
            values.push(value);
        }
        string += `${values.join("\t")}\n`;
    }

    await writeFile(path, string);
}

function flattenJsonObject(jsonObject) {
    const result = {};
    for (const jsonObjectKey of Object.keys(jsonObject)) {
        if (isObject(jsonObject[jsonObjectKey])) {
            const flattenedJsonObject = flattenJsonObject(jsonObject[jsonObjectKey]);

            for (const flattenedJsonObjectKey of Object.keys(flattenedJsonObject)) {
                result[`${jsonObjectKey}.${flattenedJsonObjectKey}`] = flattenedJsonObject[flattenedJsonObjectKey];
            }
        } else {
            result[jsonObjectKey] = jsonObject[jsonObjectKey];
        }
    }
    return result;
}

function flattenJsonArray(jsonArray) {
    const result = [];
    for (let jsonObject of jsonArray) {
        jsonObject = flattenJsonObject(jsonObject);
        result.push(jsonObject);
    }
    return result;
}

function sanitizeJsonObject(jsonObject) {
    const result = {};
    for (const jsonObjectKey of Object.keys(jsonObject)) {
        if (typeof jsonObject[jsonObjectKey] === "string") {
            result[jsonObjectKey] = jsonObject[jsonObjectKey].replaceAll("\n", "\\n").replaceAll("\t", "\\t");
        } else {
            result[jsonObjectKey] = jsonObject[jsonObjectKey];
        }
    }
    return result;
}

function sanitizeJsonArray(jsonArray) {
    const result = [];
    for (let jsonObject of jsonArray) {
        jsonObject = sanitizeJsonObject(jsonObject);
        result.push(jsonObject);
    }
    return result;
}

function formatJsonObject(jsonObject) {
    const result = {};
    for (const jsonObjectKey of Object.keys(jsonObject)) {
        if (typeof jsonObject[jsonObjectKey] === "boolean") {
            result[jsonObjectKey.toLowerCase()] = jsonObject[jsonObjectKey] ? "TRUE" : "FALSE";
        } else {
            result[jsonObjectKey.toLowerCase()] = jsonObject[jsonObjectKey];
        }
    }
    return result;
}

function formatJsonArray(jsonArray) {
    const result = [];
    for (let jsonObject of jsonArray) {
        jsonObject = formatJsonObject(jsonObject);
        result.push(jsonObject);
    }
    return result;
}

function parseCmdArgs() {
    const result = {};

    for (const arg of process.argv) {
        switch (arg) {
            case "--fetch":
                result.fetch = true;
        }
    }

    return result;
}

function hasRecipeContaining(itemJson, id) {
    if (!("recipes" in itemJson)) {
        return false;
    }

    for (const recipe of itemJson.recipes) {
        if (!("crafting" in recipe)) {
            continue;
        }

        for (const ingredient of Object.values(recipe["crafting"])) {
            if (ingredient.itemId === id) {
                return true;
            }
        }
    }

    return false;
}

async function getItemsJson() {
    const officialItemsRes = await fetch(OFFICIAL_ITEMS_URL);
    const officialItems = await officialItemsRes.json();

    if (!officialItems.success) {
        console.error("Fetch official items usuccessful");
        return;
    }

    const repoItemsRes = await fetch(REPO_ITEMS_URL);
    const repoItems = await repoItemsRes.json();

    const coflPricesRes = await fetch(COFL_PRICES_URL);
    const coflPrices = await coflPricesRes.json();

    const result = [];
    for (const officialItem of officialItems.items) {
        let resultObject;
        if (officialItem.id in repoItems.items) {
            const repoItem = repoItems.items[officialItem.id];
            resultObject = {...officialItem, ...repoItem};
        } else {
            resultObject = officialItem;
        }

        if (officialItem.id in coflPrices) {
            resultObject.price = coflPrices[officialItem.id];
        }
        result.push(resultObject);
    }
    return result;
}

function getColumns(itemsJson) {
    const columns = {};
    for (const itemJson of itemsJson) {
        for (const key of Object.keys(itemJson)) {
            if (!(key in columns)) {
                columns[key] = [];
            }
        }
    }
    return columns;
}

function createItemsTable(itemsJson) {
    itemsJson = flattenJsonArray(itemsJson);
    itemsJson = sanitizeJsonArray(itemsJson);
    itemsJson = formatJsonArray(itemsJson);
    const table = getColumns(itemsJson);
    const tableKeys = Object.keys(table);

    for (const itemJson of itemsJson) {
        for (const column of tableKeys) {
            if (column in itemJson) {
                table[column].push(itemJson[column]);
            } else {
                table[column].push("");
            }
        }
    }

    return table;
}

function getAccessoriesList(itemsJson) {
    const result = [];
    for (const itemJson of itemsJson) {
        if (itemJson.category === "Accessory") {
            result.push(itemJson);
        }
    }
    return result;
}

function getAccessoryUpgradesJson(itemsJson) {
    const accessories = getAccessoriesList(itemsJson);
    const result = [];
    for (const accessory of accessories) {
        for (const parentAccessory of accessories) {
            if (hasRecipeContaining(parentAccessory, accessory.id)) {
                result.push({parent: parentAccessory.id, child: accessory.id});
            }
        }
    }
    return result;
}

function createAccessoryUpgradesTable(accessoryUpgradesJson) {
    const result = {
        parent: [],
        child: [],
    };

    for (const accessoryUpgrade of accessoryUpgradesJson) {
        result.parent.push(accessoryUpgrade.parent);
        result.child.push(accessoryUpgrade.child);
    }

    return result;
}

const args = parseCmdArgs();

let itemsJson;
if ("fetch" in args || !existsSync(ITEMS_JSON_PATH)) {
    itemsJson = await getItemsJson();
    await writeJsonFile(itemsJson, ITEMS_JSON_PATH);
} else {
    itemsJson = await readJsonFile(ITEMS_JSON_PATH);
}

const itemsTable = createItemsTable(itemsJson);
writeTsvFile(itemsTable, ITEMS_TABLE_PATH);

const accessoryUpgradesJson = getAccessoryUpgradesJson(itemsJson);
const accessoryUpgradesTable = createAccessoryUpgradesTable(accessoryUpgradesJson);
writeTsvFile(accessoryUpgradesTable, ACCESSORY_UPGRADES_TABLE_PATH);
