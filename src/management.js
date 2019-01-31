// Check if the extension has been updated.
function checkExtensionVersion(extension) {
  // Ignore extensions in development (except us).
  if (extension.installType !== 'development' || extension.id === chrome.runtime.id) {
    // Show a notification if the extension version has changed.
    var currentVersion = localStorage[extension.id];
    if (currentVersion && (currentVersion !== extension.version)) {
      // And if the user hasn't already seen this notification.
      showExtensionUpdateNotification(extension, currentVersion);
    }
    // Store new version of this extension.
    localStorage[extension.id] = extension.version;
  }
}

// Clean stored data when extension is uninstalled.
function onExtensionUninstalled(extensionId) {
  var storageAreas = ['local', 'sync'];
  storageAreas.forEach(function(storageArea) {
    chrome.storage[storageArea].get(null, function(data) {
      var keys = Object.keys(data).filter(function(key) {
        return key.startsWith(extensionId);
      });
      // Clean extension notifications.
      chrome.storage[storageArea].remove(keys);
    });
  });
  // Clean extension info.
  localStorage.removeItem(extensionId);
}

// Dismiss extension notifications when extension is disabled.
function onExtensionDisabled(extension) {
  closeExtensionNotifications(extension.id);
}

// At startup...
chrome.management.getAll(function(extensions) {
  // Check and save all installed extensions once.
  extensions.forEach(function(extension) {
    checkExtensionVersion(extension);
  });
  // Clean storage.
  chrome.management.getAll(function(results) {
    var extensions = results.map(function(e) { return e.id });
    var keysToRemove = [];
    chrome.storage.sync.get(null, function(results) {
      Object.keys(results).forEach(function(key) {
        // Keep extensions storage history from extensions that are still there
        // and remove the other ones.
        if (key.length > 32 && extensions.indexOf(key.slice(0, 32)) < 0) {
          keysToRemove.push(key);
        }
      });
      chrome.storage.sync.remove(keysToRemove);
    });
  });
});

// Register all listeners.
browser.management.onInstalled.addListener(checkExtensionVersion);
browser.management.onUninstalled.addListener(onExtensionUninstalled);
browser.management.onDisabled.addListener(onExtensionDisabled);
