import { readFile, writeFile } from "fs/promises";
import { AsyncParser } from "@json2csv/node";
import { flatten } from "@json2csv/transforms";

export async function readJsonFile(path) {
    return JSON.parse(await readFile(path));
}

export async function writeJsonFile(json, path) {
    await writeFile(path, JSON.stringify(json));
}

export async function writeTsvFile(json, path) {
    const opts = {
        delimiter: "\t",
        fields: getFields(json),
        transforms: [flatten()]
    };
    const transformOpts = {};
    const asyncOpts = {};
    const parser = new AsyncParser(opts, asyncOpts, transformOpts);

    const tsv = await parser.parse(json).promise();
    await writeFile(path, tsv);
}

function getFields(jsonArray) {
    const result = [];

    for (const jsonObject of jsonArray) {
        for (const field of Object.keys(jsonObject)) {
            if (!result.includes(field)) {
                result.push(field);
            }
        }
    }

    return result;
}
