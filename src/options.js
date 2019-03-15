var autoCloseNotificationCheckbox = document.querySelector('#autoCloseNotification');
var openHomepageCheckbox = document.querySelector('#openHomepage');

// Saves synced options.
function saveOptions() {
  var autoCloseNotification = autoCloseNotificationCheckbox.checked;
  var openHomepage = openHomepageCheckbox.value

  chrome.storage.sync.set({
    autoCloseNotification: autoCloseNotification,
    openHomepage: openHomepage
  });
}

// Restores synced preferences.
window.onload = function() {
  var elements = document.querySelectorAll('[i18-content]');
  for (var element, i = 0; element = elements[i]; i++) {
    var messageName = element.getAttribute('i18-content');
    element.textContent = chrome.i18n.getMessage(messageName);
  }

  var defaultOptions = {
    autoCloseNotification: DEFAULT_OPTIONS.AUTO_CLOSE_NOTIFICATION,
    openHomepage: DEFAULT_OPTIONS.OPEN_HOMEPAGE,
  };

  chrome.storage.sync.get(defaultOptions, function(results) {
    autoCloseNotificationCheckbox.checked = results.autoCloseNotification;
    openHomepageCheckbox.value = results.openHomepage === true ?
                                  DEFAULT_OPTIONS.OPEN_HOMEPAGE :
                                  results.openHomepage;
  });
  autoCloseNotificationCheckbox.onchange = saveOptions;
  openHomepageCheckbox.onchange = saveOptions;
}
