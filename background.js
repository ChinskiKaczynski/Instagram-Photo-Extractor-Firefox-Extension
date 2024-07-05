browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "openPhotoInNewTab") {
    browser.tabs.create({ url: message.photoUrl });
  }
});