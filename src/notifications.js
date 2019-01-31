var iconSize = 48 * devicePixelRatio;
var notificationSize = 80 * devicePixelRatio;
var buttonSize = 16 * devicePixelRatio;
var extensionHomepages = {}

// Helper function which returns a basic notification options object.
function getNotificationOptions(extension) {

  return {
    type: 'basic',
    priority: 2,
    iconUrl: extension.icons ? extension.icons[extension.icons.length-1].url : "chrome://browser/content/extension.svg"
  };
}

// Helper function which displays a notification.
function showNotification(notificationId, options) {

    chrome.notifications.create(notificationId, options, function(){
      chrome.storage.sync.get({autoCloseNotification: DEFAULT_OPTIONS.AUTO_CLOSE_NOTIFICATION}, function(results) {
        if (results.autoCloseNotification) {
          // Raises an alarm to close notification after 10s.
          chrome.alarms.create(notificationId, { when: Date.now() + 1e3 });
        }
      });
    });
}

// Helper function to create notification Id
function getNotificationId(extension) {
  let id = extension.id + extension.version
  extensionHomepages[id] = extension.homepageUrl

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

  var gettingInfo = browser.management.get(extension.id);
  gettingInfo.then(function (info) {

    var options = setExtensionUpdateNotificationOptions(info, oldVersion);
    showNotification(getNotificationId(info), options);

  });
}

// Clear notification if user clicks on it.
function onNotificationsClicked(notificationId) {

  console.log(notificationId);

  chrome.storage.sync.get({openHomepage: DEFAULT_OPTIONS.OPEN_HOMEPAGE}, function(results) {
    if (results.openHomepage) {
      var creating = browser.tabs.create({
        url: extensionHomepages[notificationId]
        });
      }
  })

  // Open new options page.
  if (notificationId === 'newOptions') {
    chrome.runtime.openOptionsPage();
  }
  var clickedNotification = {};
  clickedNotification[notificationId] = 'clickedByUser';
  chrome.storage.local.set(clickedNotification, function() {
    chrome.notifications.clear(notificationId);
  });
}

// Warn the others that this notification has been closed by the user.
function onNotificationsClosed(notificationId, closedByUser) {
  chrome.storage.local.get(notificationId, function(results) {
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
 chrome.notifications.getAll(function(notificationIds) {
    Object.keys(notificationIds).forEach(function(notificationId) {
      if (notificationId.indexOf(extensionId) === 0) {
        chrome.notifications.clear(notificationId);
      }
    });
  });
}

function onAlarm(alarm) {
  // Show new options notification when alarm is received.
  if (alarm.name === 'newOptions') {
    chrome.storage.sync.get('newOptions', function(results) {
      if (results['newOptions'] !== 'closedByUser') {

        var gettingInfo = browser.management.get(chrome.runtime.id);
        gettingInfo.then(function (info) {

          var options = getNotificationOptions(info);
          options.title = chrome.i18n.getMessage('newOptionsTitle');
          options.message = chrome.i18n.getMessage('newOptionsText');

          showNotification('newOptions', options);

        });

      }
    });
  // Clear notification otherwise.
  } else {
   chrome.storage.sync.get({autoCloseNotification: DEFAULT_OPTIONS.AUTO_CLOSE_NOTIFICATION}, function(results) {
     if (results.autoCloseNotification) {
       var notificationId = alarm.name;
       chrome.notifications.clear(notificationId);
     }
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

  // Wait for 30 seconds before prompting user about new options.
  chrome.alarms.create('newOptions', { when: Date.now() + 30e3 });
}

// Register all listeners.
chrome.alarms.onAlarm.addListener(onAlarm);
chrome.notifications.onClicked.addListener(onNotificationsClicked);
chrome.notifications.onClosed.addListener(onNotificationsClosed);
chrome.storage.onChanged.addListener(onStorageChanged);
chrome.runtime.onInstalled.addListener(onInstalled);
