export const sleep = ms => new Promise(r => setTimeout(r, ms));

export function formatUrl(url, queries) {
    let result = url;

    if (queries.length > 0) {
        result += `?${queries.join("&")}`;
    }

    return result;
}
