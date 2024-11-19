(function() {
  "use strict";

  const commonHeaders = {
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "accept": "*/*",
    "accept-language": "en-US,en;q=0.9",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "x-ig-app-id": "936619743392459",
    "x-requested-with": "XMLHttpRequest",
    "x-csrftoken": document.cookie.match(/csrftoken=([^;]+)/)?.[1] || "",
    "referer": "https://www.instagram.com/"
  };

  async function fetchMediaInfo(url) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: commonHeaders,
        credentials: 'include',
        mode: 'cors'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error("Request failed:", error);
      return null;
    }
  }

  async function retryFetch(fn, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (err) {
        if (i === retries - 1) throw err;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  async function extractMedia() {
    const url = window.location.href;
    if (url.includes("/stories/")) {
      await extractStoryMedia();
    } else {
      await extractMediaFromPost();
    }
  }

  async function extractStoryMedia() {
    let storyId = null;
    const maxRetries = 5; // Maksymalna liczba prób
    const retryDelay = 1000; // Opóźnienie między próbami (w milisekundach)

    // Wielokrotna próba znalezienia story ID
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      storyId = window.location.href.match(/\/stories\/[^\/]+\/(\d+)/)?.[1];
      if (storyId) break;
      await new Promise(resolve => setTimeout(resolve, retryDelay)); // Czekamy przed kolejną próbą
    }

    if (!storyId) {
      console.log("No story ID found after multiple attempts.");
      return;
    }

    const storyUrl = `https://i.instagram.com/api/v1/media/${storyId}/info/`;
    const data = await fetchMediaInfo(storyUrl);

    if (data?.items?.[0]) {
      const storyItem = data.items[0];
      const mediaUrl = storyItem.is_video 
        ? storyItem.video_versions[0]?.url 
        : storyItem.image_versions2.candidates[0]?.url;
      openMedia({
        url: mediaUrl,
        username: storyItem.user.username,
        taken_at: storyItem.taken_at,
        id: storyItem.pk
      });
    } else {
      console.log("No media found for the story.");
    }
  }

  async function extractMediaFromPost() {
    const url = window.location.href;
    const shortcode = url.match(/\/p\/([^\/]+)/)?.[1];
    if (!shortcode) {
      console.log("No shortcode found in URL.");
      return;
    }

    const mediaId = await getMediaId(shortcode);
    if (!mediaId) {
      console.log("No media ID found.");
      return;
    }

    const imgIndexMatch = url.match(/img_index=(\d+)/);
    const imgIndex = imgIndexMatch ? parseInt(imgIndexMatch[1], 10) : 1;

    const mediaInfo = await retryFetch(() => extractCurrentMedia(mediaId, imgIndex));
    if (mediaInfo) {
      openMedia(mediaInfo);
    } else {
      console.log("Failed to retrieve current media.");
    }
  }

  async function getMediaId(shortcode) {
    const url = `https://www.instagram.com/api/v1/oembed/?url=https://www.instagram.com/p/${shortcode}/`;
    const data = await fetchMediaInfo(url);
    return data?.media_id || null;
  }

  async function extractCurrentMedia(mediaId, imgIndex) {
    const url = `https://i.instagram.com/api/v1/media/${mediaId}/info/`;
    const data = await retryFetch(() => fetchMediaInfo(url));

    if (!data || !data.items || !data.items[0]) {
      console.log("No media found or invalid response.");
      return null;
    }

    const mediaItem = data.items[0];
    const isCarousel = Array.isArray(mediaItem.carousel_media);
    const currentMedia = isCarousel ? mediaItem.carousel_media[imgIndex - 1] : mediaItem;

    if (currentMedia) {
      const mediaUrl = currentMedia.is_video 
        ? currentMedia.video_versions[0]?.url 
        : currentMedia.image_versions2.candidates[0]?.url;
      
      return mediaUrl ? { 
        url: mediaUrl, 
        type: currentMedia.is_video ? "video" : "photo",
        username: mediaItem.user.username,
        taken_at: mediaItem.taken_at,
        id: mediaItem.pk
      } : null;
    }

    return null;
  }

  async function openMedia(mediaInfo) {
    if (mediaInfo?.url) {
      try {
        const response = await fetch(mediaInfo.url);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        const date = new Date(mediaInfo.taken_at * 1000);
        const formattedDate = date.toISOString().split('T')[0];
        const filename = `${mediaInfo.username}_${mediaInfo.id}_${formattedDate}.jpg`;

        const link = document.createElement("a");
        link.href = url;
        link.download = filename;

        document.body.appendChild(link);
        link.click();

        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 100);
      } catch (error) {
        console.error("Failed to download media:", error);
      }
    } else {
      console.log("No media found!");
    }
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "extractMedia") {
      extractMedia();
    }
  });
})();
