export function normalizePageContents(pageContents) {
    let result = pageContents;

    result = result.replaceAll(
        /\{\{\s*Infobox\s*([^\n|}]*)/gi,
        (_, name) => `{{Infobox ${name.trim()}`
    );

    return result;
}

export function formatInfoboxData(infobox) {
    const result = {};

    for (const infoboxDataKey of Object.keys(infobox.data)) {
        result[infoboxDataKey] = infobox.data[infoboxDataKey].text();
    }

    return result;
}

export function parseInfoboxTabs(infoboxData) {
    let result = [{}]; // result[0] is used to store items that are not in tabs because 0 is usually unused in terms of tab indices

    let tab = 0;
    for (const key in infoboxData) {
        const tabMatch = /^tab(\d+)/gi.exec(key);

        if (tabMatch !== null) {
            tab = +tabMatch[1];
            result[tab] = {};
            continue;
        }

        const keyTrim = key.replaceAll(new RegExp(`${tab}$`, "gi"), "");
        result[tab][keyTrim] = infoboxData[key];
    }

    while (result.length > 0 && (Object.keys(result[0]).length === 0 || result[0] === undefined)) {
        result.shift();
    }

    return result;
}
