// TODOs
// refactor to use ids instead of titles
// deal with scrollbars
// search functionality
// change layout so search covers entire top /  figure out something

(function (){
  var catDropdown = null;
  
  document.addEventListener('DOMContentLoaded', function() {
    let tabContainer = $('#tabContainer');
    let categoryContainer = $('#categoryContainer');
    
    getTabs(function(tabs) {
      renderTabList(tabs, tabContainer);
    });

    getBookmarks(function(bookmarks) {
      renderCategories(bookmarks, categoryContainer);
    });
  });

  function renderTabList(tabs, tabContainer) {
    for (let i = 0; i < tabs.length; i++) {
      renderTab(tabs[i], tabContainer)
    }
  }
  
  chrome.tabs.onUpdated.addListener(function updateTitle(tabId, changeinfo, tab) {
    if (tab.title) {
      $('#tab-' + tabId).text(tab.title);
      $('#savetab-' + tabId).attr('title', tab.title);
    }
  });

  function renderTab(tab, container) {
    let btnGrp = $('<div/>')
      .addClass('btn-group')
      .addClass('btn-group-xs')
      .addClass('pad-top')
      .attr('role', 'group')
      .attr('aria-label', '...')
      .appendTo(container);

    let title = tab.title;
    if (tab.status === 'loading') {
      if (!title) {
        title = 'Loading ...';
      }
    }
    
    $('<a/>')
      .addClass('btn')
      .addClass('btn-default')
      .addClass('btn-350')
      .attr('role', 'button')
      .attr('id','tab-' + tab.id)
      .text(title)
      .click(function(){
        chrome.tabs.update(tab.id, {
          active: true
        });
      })
      .appendTo(btnGrp);
    
    let saveBtn = $('<a/>')
      .addClass('btn')
      .attr('role', 'button')
      .attr('id', 'savetab-' + tab.id)
      .attr('href', tab.url)
      .attr('title', tab.title)
      .appendTo(btnGrp).append($('<span/>')
        .addClass('glyphicon')
        .addClass('glyphicon-arrow-right')
      );

    $('<br/>')
      .appendTo(container);
    
    if (tab.pinned) {
      saveBtn
        .addClass('btn-default')
        .addClass('disabled');
    } else {
      saveBtn
        .addClass('btn-warning')
        .click(function() {
          //create bookmark from tab
          var context = this;
          chrome.bookmarks.search({
            title: catDropdown.selected
          }, function(results) {
            if (results.length > 0) {
              chrome.bookmarks.create({
                title: context.title,
                url: context.href,
                parentId: results[0].id
              }, function(createdBookmark) {
                renderBookmark(createdBookmark, $('#bookmarkContainer'));
                btnGrp.next('br').remove();
                btnGrp.remove();
                chrome.tabs.remove(tab.id);
              });
            }
          });
        });
    }
  }

  function renderCategories(bookmarks, categoryContainer) {
    catDropdown = new Dropdown('Category: {item} ', categoryContainer);
    catDropdown.addItem('None', selectCategory, 'Tabby');
    for (let i = 0; i < bookmarks.length; i++) {
      catDropdown.addItem(bookmarks[i].title, selectCategory);
    }
    catDropdown.addBtnListener(createCategory);
  }

  function selectCategory() {
    let bookmarkContainer = $('#bookmarkContainer');
    bookmarkContainer.children().remove();
    chrome.bookmarks.search({
      title: this.href.split('#')[1],
      url: null
    }, function(bookmarks) {
      if (bookmarks.length > 0) {
        chrome.bookmarks.getChildren(bookmarks[0].id, function(children) {
          children = children.filter(function(child) {
            return child.url != null;
          });
          for (let i = 0; i < children.length; i++) {
            renderBookmark(children[i], bookmarkContainer);
          }
        });
      }
    });
  }

  function renderBookmark(bookmark, container) {
    let btnGrp = $('<div/>')
      .addClass('btn-group')
      .addClass('btn-group-xs')
      .addClass('pad-top')
      .attr('role', 'group')
      .attr('aria-label', '...')
      .appendTo(container);
      
    $('<a/>')
      .addClass('btn')
      .addClass('btn-warning')
      .attr('href', bookmark.url)
      .attr('id', bookmark.id)
      .attr('role', 'button')
      .click(function() {
        chrome.tabs.create({
          url: this.href,
          active: false
        }, function(tab) {
          renderTab(tab, $('#tabContainer'));
        });
        chrome.bookmarks.remove(this.id);
        btnGrp.next('br').remove();
        btnGrp.remove();
      })
      .appendTo(btnGrp).append($('<span/>')
        .addClass('glyphicon')
        .addClass('glyphicon-arrow-left')
      )
      
    $('<a/>')
      .addClass('btn')
      .addClass('btn-default')
      .addClass('btn-350')
      .attr('href', bookmark.url)
      .attr('role', 'button')
      .text(bookmark.title)
      .click(function() {
        chrome.tabs.create({url:this.href});
      })
      .appendTo(btnGrp);

    $('<br/>')
      .appendTo(container);
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
        callback(children.filter(function(child) {
          return child.url == null;
        }));
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
    catDropdown.addItem(catName, selectCategory);
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
        .addClass('btn-group-xs')
        .attr('role','group')
        .appendTo(this.dropdownDiv);
      
      this.addCatBtn = $('<button/>')
        .addClass('btn')
        .addClass('btn-primary')
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
        .addClass('btn-350')
        .addClass('dropdown-toggle')
        .appendTo(btnGroup);
        
      this.labelSpan = $('<span/>')
        .text(this.title.replace('{item}',''))
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
    
    addItem(itemTitle, clickHandler, itemValue) {
      if (this.dropdown.find('li>a').filter(':contains("' + itemTitle + '")').length > 0) {
        throw 'Cannot add item "' + itemTitle + '" - item with that name already exists';
      }
      
      if (typeof itemValue == 'undefined') {
        var itemValue = itemTitle;
      }
      
      let item = $('<a/>')
        .attr('href','#' + itemValue)
        .text(itemTitle)
        .appendTo(
          $('<li/>')
            .appendTo(this.dropdown));
      
      var context = this;
      item.click(function() {
        context.selectItem(itemTitle, itemValue);
      });
      
      if (typeof clickHandler != 'undefined') {
        item.click(clickHandler);
      }
      
      if (this.dropdown.find('li>a').length === 1) {
        this.selectItem(itemTitle, itemValue);
        if (typeof clickHandler != 'undefined') {
          clickHandler.call(item[0]);
        }
      }
    }
    
    selectItem(itemTitle, itemValue) {
      if (this.dropdown.find('li>a').filter(':contains("' + itemTitle + '")').length < 1) {
        throw 'Cannot select item "' + itemTitle + '" - not found';
      }
      this.selected = itemValue;
      this.labelSpan.text(this.title.replace('{item}', itemTitle));
    }
    
    get html() {
      return this.dropdownDiv.html();
    }
  }
})();
