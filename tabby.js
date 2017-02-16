(function (){
  var catDropdown = null;
  
  document.addEventListener('DOMContentLoaded', function() {
    let tabContainer = $('#tabContainer')
    let categoryContainer = $('#categoryContainer');
    
    getTabs(function(tabs) {
      renderTabList(tabs, tabContainer);
    });

    getBookmarks(function(bookmarks) {
      renderCategories(bookmarks, categoryContainer);
    });
  });

  function renderTabList(tabs, tabContainer) {
  }

  function renderCategories(bookmarks, categoryContainer) {
    catDropdown = new Dropdown('Category: {item} ', categoryContainer);
    catDropdown.addItem('None');
    for (let i = 0; i < bookmarks.length; i++) {
      catDropdown.addItem(bookmarks[i].title);
    }
    
    catDropdown.addBtnListener(createCategory);
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
  
  function createCategory() {
    let catName = prompt('Please enter a category name');
    while (!catName) {
      if (catName === null) {
        return;
      }
      let catName = prompt('Please enter a category name\nCategory name cannot be empty');
    }
    catDropdown.addItem(catName);
    getRootBookmark(function(rootBookmark) {
      chrome.bookmarks.create({
        title: catName,
        url: null,
        parentId: rootBookmark.id
      });
    });
  }
  
  class Dropdown {
    constructor(title, parentElement){
      this.dropdownDiv = $('<div/>')
        .addClass('dropdown');
        
      this.title = title;
      
      this.selected = '';
      
      let btnGroup = $('<div/>')
        .addClass('btn-group')
        .attr('role','group')
        .appendTo(this.dropdownDiv);
      
      this.addCatBtn = $('<button/>')
        .addClass('btn')
        .addClass('btn-default')
        .appendTo(btnGroup);
        
      $('<span/>')
        .addClass('glyphicon')
        .addClass('glyphicon-plus')
        .appendTo(this.addCatBtn);
      
      this.dropdownLbl = $('<button/>')
        .attr('id','dLbl')
        .attr('data-toggle','dropdown')
        .attr('type','button')
        .attr('aria-haspopup','true')
        .attr('aria-expanded','false')
        .addClass('btn')
        .addClass('btn-default')
        .addClass('dropdown-toggle')
        .appendTo(btnGroup);
        
      this.labelSpan = $('<span/>')
        .text(this.title.replace('{item}',''))
        .appendTo(this.dropdownLbl);
        
      this.caret = $('<span/>')
        .addClass('caret')
        .appendTo(this.dropdownLbl);
      
      this.dropdown = $('<ul/>')
        .addClass('dropdown-menu')
        .attr('aria-labelledby','dLbl')
        .appendTo(btnGroup);
      
      try {
        this.dropdownDiv.appendTo(parentElement);
      } catch (e) {}
    }
    
    addBtnListener(callback) {
      this.addCatBtn.on('click', callback);
    }
    
    removeBtnListener(callback) {
      this.addCatBtn.off('click', callback);
    }
    
    addItem(itemTitle, clickHandler) {
      if (this.dropdown.find('li>a').filter(':contains("' + itemTitle + '")').length > 0) {
        throw 'Cannot add item "' + itemTitle + '" - item with that name already exists';
      }
      
      let item = $('<a/>')
        .attr('href','#' + itemTitle)
        .text(itemTitle)
        .appendTo(
          $('<li/>')
            .appendTo(this.dropdown));
      
      var context = this;
      item.click(function() {
        context.selectItem(this.textContent);
      });
      
      try {
        item.click(clickHandler)
      } catch (e) {}
      
      if (this.dropdown.find('li>a').length === 1) {
        this.selectItem(itemTitle);
      }
    }
    
    selectItem(itemTitle) {
      if (this.dropdown.find('li>a').filter(':contains("' + itemTitle + '")').length < 1) {
        throw 'Cannot select item "' + itemTitle + '" - not found';
      }
      this.selected = itemTitle;
      this.labelSpan.text(this.title.replace('{item}', itemTitle));
    }
    
    get html() {
      return this.dropdownDiv.html();
    }
  }
})();
