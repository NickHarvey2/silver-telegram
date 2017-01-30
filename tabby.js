(function (){
  var categories = ['extensions'];
  var rootBookmarkNode = null;

  chrome.bookmarks.search({
    title: 'Tabs',
    url: null
  }, function(searchResults){
    rootBookmarkNode = searchResults[0];
  });

  function getTabs(callback) {
    chrome.tabs.query({
      currentWindow: true
    }, function(tabs) {
      callback(tabs);
    });
  }

  function renderTabList(tabs) {
    var contentPane = document.getElementById('content');
    var tabList = document.createElement('UL');
    contentPane.appendChild(tabList);
    for (var tabIdx = 0; tabIdx < tabs.length; tabIdx++) {
      var tabItem = document.createElement('LI');
      tabItem.setAttribute('tab-id', tabs[tabIdx].id);
      tabItem.addEventListener('click', switchTab);
      tabItem.className = 'tab';

      var span = document.createElement('SPAN');
      span.innerHTML = tabs[tabIdx].title;
      span.className = 'tabTitle tab';

      var closeBtn = document.createElement('SPAN');
      closeBtn.className = 'closeBtn';

      var faveBtn = document.createElement('SPAN');
      faveBtn.className = 'faveBtn';

      tabItem.appendChild(faveBtn);
      tabItem.appendChild(span);
      tabItem.appendChild(closeBtn);

      tabList.appendChild(tabItem);
    }

    var newTabItem = document.createElement('LI');
    newTabItem.addEventListener('click', createTab);

    var span = document.createElement('SPAN');
    span.innerHTML = 'New Tab';
    span.className = 'tabTitle';

    var spacer = document.createElement('SPAN');
    spacer.className = 'spacer';

    newTabItem.appendChild(spacer);
    newTabItem.appendChild(span);

    tabList.appendChild(newTabItem);

    contentPane.appendChild(document.createElement('HR'));
  }

  function switchTab(event) {
    var li = event.target.tagName === 'LI' || event.target.tagName === 'li' ? event.target : event.target.parentElement;
    var tabId = li.getAttribute('tab-id');
    var classList = event.target.classList;
    if (!tabId) {
      return;
    } else if (classList.contains('tab')) {
      chrome.tabs.update(parseInt(tabId), {
        active: true
      }); 
    } else if (classList.contains('closeBtn')) {
      chrome.tabs.remove(parseInt(tabId)); 
      li.parentElement.removeChild(li);
    } else if (classList.contains('faveBtn')) {
      chrome.tabs.get(parseInt(tabId), function(tab) {
        createFaveIn(categories[0], tab);
      });
      chrome.tabs.remove(parseInt(tabId)); 
      li.parentElement.removeChild(li);
    }
  }

  function createFaveIn(folderName, tab) {
    chrome.bookmarks.search({
      url: null,
      title: folderName,
      parentId: rootBookmarkNode ? rootBookmarkNode.id : null
    }, function(searchResults) {
      if (searchResults.length > 0) {
        createFaveFromTab(tab, searchResults[0]);
      } else {
        chrome.bookmarks.create({
          url: null,
          title: folderName,
          parentId: rootBookmarkNode ? rootBookmarkNode.id : null
        }, function(folder) {
          createFaveFromTab(tab, folder);
        });
      }

    });
  }

  function createFaveFromTab(tab, parent) {
    chrome.bookmarks.create({
      url: tab.url,
      title: tab.title,
      parentId: parent.id
    });
  }

  function createTab(event) {
    chrome.tabs.create({
      active: true
    }); 
  }

  document.addEventListener('DOMContentLoaded', function() {
    getTabs(function(tabs){
      renderTabList(tabs);
    });
  });
})();
