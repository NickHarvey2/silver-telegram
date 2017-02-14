(function (){

  document.addEventListener('DOMContentLoaded', function() {
    var tabDiv = document.getElementById('tabDiv')
    var categoryDiv = document.getElementById('categoryDiv');
    
    getTabs(function(tabs) {
      renderTabList(tabs, tabDiv);
    });

    getBookmarks(function(bookmarks) {
      renderCategories(bookmarks, categoryDiv);
    });
  });

  function renderTabList(tabs, tabDiv) {
    var tabList = document.createElement('UL');
    tabList.className = 'nav nav-pills nav-stacked';
    for (var tabIdx in tabs) {
      var tabItem = document.createElement('LI');
      var tabLink = document.createElement('A');
      tabLink.textContent = tabs[tabIdx].title;
      tabItem.role = 'presentation';
      tabLink.href = '#';
      tabLink.tabId = tabs[tabIdx].id;
      tabLink.addEventListener('click', function(){
        chrome.tabs.update(event.target.tabId, { active: true });
      });
      tabItem.className = tabs[tabIdx].active ? 'active' : '';
      tabItem.appendChild(tabLink);
      tabList.appendChild(tabItem);
    }
    tabDiv.appendChild(tabList);
  }

  function getTabs(callback) {
    chrome.tabs.query({
      currentWindow: true
    }, function(tabs) {
      callback(tabs);
    });
  }

  function getBookmarks(callback) {
    getRootBookmark(function(rootBookmark) {
      chrome.bookmarks.getChildren(rootBookmark.id, function(children) {
        callback(children);
      });
    });
  }
  
  function getRootBookmark(callback) {
    chrome.bookmarks.search({
      title: 'Tabby',
      url: null
    }, function(bookmarks) {
      if (bookmarks.length > 0) {
        callback(bookmarks[0]);
      } else {
        chrome.bookmarks.create({
          title: 'Tabby',
          url: null
        }, function(rootBookmark) {
          callback(rootBookmark);
        });
      }
    });
  }

  function renderCategories(bookmarks, categoryDiv) {
  } 
})();
