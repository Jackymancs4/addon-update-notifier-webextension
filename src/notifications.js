var iconSize = 48 * devicePixelRatio;
var notificationSize = 80 * devicePixelRatio;
var buttonSize = 16 * devicePixelRatio;
var addonDB = {}

// Helper function which returns a basic notification options object.
function getNotificationOptions(extension) {
  return {
    type: 'basic',
    priority: 2,
    iconUrl: extension.icons ? extension.hostPermissions[extension.hostPermissions.length - 1].slice(0, -1) + extension.icons[extension.icons.length - 1].url : "chrome://browser/content/extension.svg"
  };
}

// Helper function which displays a notification.
function showNotification(notificationId, options) {
  chrome.notifications.create(notificationId, options, function () {
    chrome.storage.sync.get({
      autoCloseNotification: DEFAULT_OPTIONS.AUTO_CLOSE_NOTIFICATION
    }, function (results) {
      if (results.autoCloseNotification) {
        // Raises an alarm to close notification after 10s.
        chrome.alarms.create("close_" + notificationId, {
          when: Date.now() + 1e3
        });
      }
    });
  });
}

// Helper function to create notification Id
function getNotificationId(extension) {
  let id = extension.id + extension.version
  addonDB[id] = extension.id

  return id;
}

// Helper function to populate notification options.
function setExtensionUpdateNotificationOptions(extension, oldVersion) {
  var options = getNotificationOptions(extension);
  options.title = chrome.i18n.getMessage('updatedExtensionTitle', [extension.name]),
    options.message = chrome.i18n.getMessage('updatedExtensionMessage',
      [extension.name, oldVersion, extension.version])

  return options;
}

function showExtensionUpdateNotification(extension, oldVersion) {

  addonDB["installed_" + getNotificationId(extension)] = oldVersion
  chrome.alarms.create("installed_" + getNotificationId(extension), {
    when: Date.now() + 1e2
  });

}

// Clear notification if user clicks on it.
function onNotificationsClicked(notificationId) {

  chrome.storage.sync.get({
    openHomepage: DEFAULT_OPTIONS.OPEN_HOMEPAGE
  }, function (results) {

    try {
      if (results.openHomepage == "2") {

        var gettingInfo = browser.management.get(addonDB[notificationId])
        gettingInfo.then(function (info) {

          if (info.homepageUrl && info.homepageUrl != "") {
            browser.tabs.create({
              url: info.homepageUrl
            });
          }
        });
      } else if (results.openHomepage == "3") {

        var gettingInfo = browser.management.get(addonDB[notificationId])
        gettingInfo.then(function (info) {

          var xhr = new XMLHttpRequest();
          xhr.open('GET', 'https://services.addons.mozilla.org/api/v4/addons/addon/' + info.id, true);

          xhr.onload = function () {

            const json = JSON.parse(xhr.responseText);
            browser.tabs.create({
              url: json.url
            });
          };

          xhr.send(null);
        });
      }
    } catch (error) {
      // Nevermind
    }
  })

  // Open new options page.
  if (notificationId === 'newOptions') {
    chrome.runtime.openOptionsPage();
  }
  var clickedNotification = {};
  clickedNotification[notificationId] = 'clickedByUser';
  chrome.storage.local.set(clickedNotification, function () {
    chrome.notifications.clear(notificationId);
  });
}

// Warn the others that this notification has been closed by the user.
function onNotificationsClosed(notificationId, closedByUser) {
  chrome.storage.local.get(notificationId, function (results) {
    if (closedByUser || results[notificationId] === 'clickedByUser') {
      var closedNotification = {};
      closedNotification[notificationId] = 'closedByUser';
      chrome.storage.sync.set(closedNotification);
    }
  });
}

// Close notification if user already closed it on another device.
function onStorageChanged(changes, area) {
  for (var notificationId in changes) {
    if (changes[notificationId].newValue === 'closedByUser')
      chrome.notifications.clear(notificationId);
  }
}

function closeExtensionNotifications(extensionId) {
  chrome.notifications.getAll(function (notificationIds) {
    Object.keys(notificationIds).forEach(function (notificationId) {
      if (notificationId.indexOf(extensionId) === 0) {
        chrome.notifications.clear(notificationId);
      }
    });
  });
}

function onAlarm(alarm) {
  if (alarm.name.slice(0, "close_".length) == "close_") {
    chrome.storage.sync.get({
      autoCloseNotification: DEFAULT_OPTIONS.AUTO_CLOSE_NOTIFICATION
    }, function (results) {
      if (results.autoCloseNotification) {
        var notificationId = alarm.name.slice("close_".length)
        chrome.notifications.clear(notificationId);
      }
    });
  } else if (alarm.name.slice(0, "installed_".length) == "installed_") {

    var gettingInfo = browser.management.get(addonDB[alarm.name.slice("installed_".length)]);
    gettingInfo.then(function (info) {
      var options = setExtensionUpdateNotificationOptions(info, addonDB[alarm.name]);
      showNotification(getNotificationId(info), options);
    });
  }
}

function onInstalled(details) {
  // Display a Welcome notification if this extension is installed for the first time.
  if (details.reason === 'install') {

    var gettingInfo = browser.management.get(chrome.runtime.id);
    gettingInfo.then(function (info) {

      var options = getNotificationOptions(info);
      options.title = chrome.i18n.getMessage('welcomeTitle');
      options.message = chrome.i18n.getMessage('welcomeText');

      showNotification('welcome', options);

    });
  }
}

// Register all listeners.
chrome.alarms.onAlarm.addListener(onAlarm);
chrome.notifications.onClicked.addListener(onNotificationsClicked);
chrome.notifications.onClosed.addListener(onNotificationsClosed);
chrome.storage.onChanged.addListener(onStorageChanged);
chrome.runtime.onInstalled.addListener(onInstalled);
