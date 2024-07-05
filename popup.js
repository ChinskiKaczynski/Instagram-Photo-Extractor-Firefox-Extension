document.getElementById('extractPhotos').addEventListener('click', () => {
  browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    browser.tabs.executeScript(tabs[0].id, { file: "content.js" });
  });
});