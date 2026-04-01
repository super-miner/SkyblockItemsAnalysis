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
