(function() {
  function extractPhotoUrl() {
    // Znajdź obraz w aktualnie otwartym poście
    const postContainer = document.querySelector('article div[role="button"] img');
    if (postContainer && postContainer.src) {
      return postContainer.src;
    }

    // Jeśli nie znaleziono obrazu, spróbuj znaleźć w innych możliwych miejscach
    const images = document.querySelectorAll('article img');
    for (let img of images) {
      if (img.src.includes('instagram')) {
        return img.src;
      }
    }
    return null;
  }

  const photoUrl = extractPhotoUrl();

  if (photoUrl) {
    browser.runtime.sendMessage({ action: "openPhotoInNewTab", photoUrl: photoUrl });
  } else {
    alert("Nie znaleziono zdjęć na tej stronie.");
  }
})();