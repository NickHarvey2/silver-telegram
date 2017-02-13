(function (){
  var tabDiv = document.createElement('DIV');
  var categoryDiv = document.createElement('DIV');

  document.addEventListener('DOMContentLoaded', function() {
    var contentPane = document.getElementById('content');
    
    getTabs(function(tabs) {
      renderTabList(tabs, tabDiv);
    });

    getBookmarks(function(bookmarks) {
      renderCategories(bookmarks, categoryDiv);
    });
    
    contentPane.appendChild(tabDiv);
    contentPane.appendChild(categoryDiv);
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
    chrome.bookmarks.search({

    }, function(bookmarks) {
      callback(bookmarks);
    });
  }

  function renderCategories(bookmarks, categoryDiv) {
    for (var bookmarkIdx in bookmarks) {
    }
  } 
})();
