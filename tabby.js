(function (){
  var rootBookmarkNode = null;
  var categorySelect = null;
  
  var tabDiv = document.createElement('DIV');
  var categoryDiv = document.createElement('DIV');

  chrome.bookmarks.search({
    title: 'Tabs',
    url: null
  }, function(searchResults){
    if (searchResults.length == 0) {
      chrome.bookmarks.create({
        title: 'Tabs',
        url: null
      }, function(bookmark) {
        rootBookmarkNode = bookmark;
      });
    } else {
      rootBookmarkNode = searchResults[0];
    }
    renderCategories(categoryDiv);
  });

  function getTabs(callback) {
    chrome.tabs.query({
      currentWindow: true
    }, function(tabs) {
      callback(tabs);
    });
  }

  function renderTabList(tabs, tabDiv) {
    var tabList = document.createElement('UL');
    for (var tabIdx = 0; tabIdx < tabs.length; tabIdx++) {
      var tabItem = document.createElement('LI');
      tabItem.setAttribute('tab-id', tabs[tabIdx].id);
      tabItem.addEventListener('click', switchTab);
      tabItem.className = 'tab';

      var span = document.createElement('SPAN');
      span.textContent = tabs[tabIdx].title;
      span.className = 'title tab';

      var closeBtn = document.createElement('SPAN');
      closeBtn.className = 'closeBtn btn rightBtn';

      var faveBtn = document.createElement('SPAN');
      faveBtn.className = 'faveBtn btn leftBtn';

      tabItem.appendChild(faveBtn);
      tabItem.appendChild(span);
      tabItem.appendChild(closeBtn);

      tabList.appendChild(tabItem);
    }

    // var newTabItem = document.createElement('LI');
    // newTabItem.addEventListener('click', createTab);

    // var span = document.createElement('SPAN');
    // span.textContent = 'New Tab';
    // span.className = 'title';

    // var plus = document.createElement('SPAN');
    // plus.className = 'btn leftBtn plusBtn';

    // newTabItem.appendChild(plus);
    // newTabItem.appendChild(span);

    // tabList.appendChild(newTabItem);
    tabDiv.appendChild(tabList);
  }
  
  function renderCategories(categoryDiv) {
    var categoryList = document.createElement('UL');
    var selectItem = document.createElement('LI');
    selectItem.className = 'nohover';
    
    categorySelect = document.createElement('SELECT');
    var categorySelectSpan = document.createElement('SPAN');
    categorySelectSpan.className = 'title';
    var noneCategoryOpt = document.createElement('OPTION');
    noneCategoryOpt.value = '';
    noneCategoryOpt.text = 'None';
    categorySelect.appendChild(noneCategoryOpt);
    
    chrome.bookmarks.getChildren(rootBookmarkNode.id, function(children) {
      for (var categoryIdx = 0; categoryIdx < children.length; categoryIdx++) {
        var categoryOpt = document.createElement('OPTION');
        categoryOpt.value = children[categoryIdx].id;
        categoryOpt.text = children[categoryIdx].title;
        categorySelect.appendChild(categoryOpt);
      }
    });

    var spacer = document.createElement('SPAN');
    spacer.className = 'btn leftBtn';
    selectItem.appendChild(spacer);
    
    categorySelectSpan.appendChild(categorySelect);
    selectItem.appendChild(categorySelectSpan);
    
    var plus = document.createElement('SPAN');
    plus.className = 'btn rightBtn plusBtn';
    plus.addEventListener('click', newCategory);
    selectItem.appendChild(plus);
    
    categoryList.appendChild(selectItem);
    categoryDiv.appendChild(categoryList);
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
        createFaveIn(categorySelect.value, tab);
      });
      chrome.tabs.remove(parseInt(tabId)); 
      li.parentElement.removeChild(li);
    }
  }

  function createFaveIn(folderId, tab) {
    alert('folderId: ' + folderId);
    if (folderId === '') { // if None category, create in root
      createFaveFromTab(tab, rootBookmarkNode);
      return;
    }
    chrome.bookmarks.get(folderId, function(folder) { // otherwise find a bookmark node (folder) under root
      if (folder.length > 0) { // if match found, 
        createFaveFromTab(tab, folder[0]); // create bookmark under it
      } else { // otherwise
        chrome.bookmarks.create({ // create it
          url: null,
          title: folderName,
          parentId: rootBookmarkNode ? rootBookmarkNode.id : null
        }, function(folder) { // and then
          createFaveFromTab(tab, folder); // create bookmark under it
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
  
  function newCategory(event) {
    var catName = prompt('Name of new category:');
    while (!catName) {
      if (catName === null) {
        return; // user cancelled, so do nothing and quit
      }
      catName = prompt('Category name must not be empty\nName of new category:');
    }
    createCategory(catName, event.target);
  }
  
  function createCategory(catName) {
    chrome.bookmarks.create({
      title: catName,
      url: null,
      parentId: rootBookmarkNode ? rootBookmarkNode.id : null
    }, function(folder) {      
      var categoryOpt = document.createElement('OPTION');
      categoryOpt.value = catName;
      categoryOpt.text = catName;
      categorySelect.insertBefore(categoryOpt, categorySelect.lastChild);
      categorySelect.value = catName;
    });
  }

  document.addEventListener('DOMContentLoaded', function() {
    var contentPane = document.getElementById('content');
    
    getTabs(function(tabs){
      renderTabList(tabs, tabDiv);
    });
    
    contentPane.appendChild(tabDiv);
    contentPane.appendChild(document.createElement('HR'));
    contentPane.appendChild(categoryDiv);
  });
})();
