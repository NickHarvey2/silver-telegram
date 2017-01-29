(function (){
  var categories = ['extensions'];

  function getTabs(callback) {
    var queryInfo = {
      currentWindow: true
    };

    chrome.tabs.query(queryInfo, function(tabs) {
      callback(tabs);
    });
  }

  function renderTabList(tabs) {
    var contentPane = document.getElementById('content');
    var tabList = document.createElement('UL');
    contentPane.appendChild(tabList);
    for (var tabIdx = 0; tabIdx < tabs.length; tabIdx++) {
      var li = document.createElement('LI');
      li.setAttribute('tab-id', tabs[tabIdx].id);
      li.addEventListener('click', switchTab);
      li.className = 'tab';

      var span = document.createElement('SPAN');
      span.innerHTML = tabs[tabIdx].title;
      span.className = 'tabTitle tab';

      var closeBtn = document.createElement('SPAN');
      closeBtn.className = 'closeBtn';

      var faveBtn = document.createElement('SPAN');
      faveBtn.className = 'faveBtn';

      li.appendChild(faveBtn);
      li.appendChild(span);
      li.appendChild(closeBtn);

      tabList.appendChild(li);
    }

    var li = document.createElement('LI');
    li.addEventListener('click', createTab);

    var span = document.createElement('SPAN');
    span.innerHTML = 'New Tab';
    span.className = 'tabTitle';

    var spacer = document.createElement('SPAN');
    spacer.className = 'spacer';

    li.appendChild(spacer);
    li.appendChild(span);

    tabList.appendChild(li);
  }

  function switchTab(event) {
    var li = event.target.tagName === 'LI' || event.target.tagName === 'li' ? event.target : event.target.parentElement;
    var tabId = li.getAttribute('tab-id');
    var classList = event.target.classList;
    if (!tabId) {
      return;
    } else if (classList.contains('tab')) {
      var updateInfo = {
        active: true
      }
      chrome.tabs.update(parseInt(tabId), updateInfo); 
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
    var searchInfo = {
      url: null,
      title: folderName
    };
    chrome.bookmarks.search(searchInfo, function(searchResults) {
      if (searchResults.length > 0) {
        createFaveFromTab(tab, searchResults[0]);
      } else {
        var folderCreateInfo = {
          url: null,
          title: folderName
        };
        chrome.bookmarks.create(folderCreateInfo, function(folder) {
          createFaveFromTab(tab, folder);
        });
      }

    });
  }

  function createFaveFromTab(tab, parent) {
    var createInfo = {
      url: tab.url,
      title: tab.title,
      parentId: parent.id
    };
    chrome.bookmarks.create(createInfo);
  }

  function createTab(event) {
    var createInfo = {
      active: true
    };
    chrome.tabs.create(createInfo); 
  }

  document.addEventListener('DOMContentLoaded', function() {
    getTabs(function(tabs){
      renderTabList(tabs);
    });
  });
})();
