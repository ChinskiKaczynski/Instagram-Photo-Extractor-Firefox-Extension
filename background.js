chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case "openPhotoInNewTab":
      chrome.tabs.create({ url: message.photoUrl });
      break;
    case "openVideoInNewTab":
      chrome.tabs.create({ url: message.videoUrl });
      break;
    default:
      console.error("Unknown action:", message.action);
  }
});
