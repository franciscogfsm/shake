/* Toolbar fallback works on other public product pages, only after a click. */
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !/^https?:\/\//.test(tab.url || "")) return;
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["extract.js", "content.js"] });
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => globalThis.ShakeMount?.(true) });
  } catch {
    // Browser-owned pages and the extension store disallow content injection.
    await chrome.action.setBadgeText({ tabId: tab.id, text: "!" });
    await chrome.action.setTitle({ tabId: tab.id, title: "Open a marketplace listing, then click SHAKE again." });
  }
});
