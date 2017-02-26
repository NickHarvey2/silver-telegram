(function (){
  var catDropdown = null;

  function scrollPad() {
    if ($('#tabContainer').parent().outerHeight(true) > window.innerHeight || $('#categoryContainer').parent().outerHeight(true) > window.innerHeight) {
      $('body').addClass('scroll-pad');
    } else {
      $('body').removeClass('scroll-pad');
    }
  }
  
  document.addEventListener('DOMContentLoaded', function() {
    let tabContainer = $('#tabContainer');
    let categoryContainer = $('#categoryContainer');
    let bookmarkContainer = $('#bookmarkContainer');

    getTabs(function(tabs) {
      renderTabList(tabs, tabContainer);
    });

    getBookmarks(function(bookmarks) {
      renderCategories(bookmarks, categoryContainer);
    });
    
    $('body').on('dragstart', '.movable', function() {
    });
    
    $('body').on('dragover', '.movable', function() {
    });
    
    $('body').on('dragdrop', '.movable', function() {
    });
    
    $('body').on('keyup', '#search', function() {
      let val = $(this).val();
      if (val.length > 2) {
        filterTabItems(val);
        filterBookmarkItems(val);
      } else {
        filterTabItems('');
        filterBookmarkItems('');
      }
      scrollPad();
    });
    
    $('body').on('click', '#clearSearch', function() {
      $('#search').val('');
      filterTabItems('');
      filterBookmarkItems('');
      scrollPad();
    })
  });
  
  function filterTabItems(filterString) {
    if (filterString) {
      $('#tabContainer').children('.btn-group').each(function(idx, item) {
        if ($(item).children('.btn-label').text().toUpperCase().search(filterString.toUpperCase()) >= 0) {
          $(item).show();
        } else {
          $(item).hide();
        }
      });
    } else {
      $('#tabContainer').children('.btn-group').show();
    }
  }
  
  function filterBookmarkItems(filterString) {
    if (filterString) {
      $('#categoryContainer').hide();
      $('#bookmarkContainer').addClass('remove-pad');
      $('#bookmarkContainer').children('.btn-group').each(function(idx, item) {
        if ($(item).children('.btn-label').text().toUpperCase().search(filterString.toUpperCase()) >= 0) {
          $(item).show();
        } else {
          $(item).hide();
        }
      });
    } else {
      $('#categoryContainer').show();
      $('#bookmarkContainer').removeClass('remove-pad');
      selectCategory.apply($('#' + catDropdown.selected)[0]);
    }
  }

  function renderTabList(tabs, tabContainer) {
    tabs.map(function(tab) {
      renderTab(tab, tabContainer)
    });
    scrollPad();
  }
  
  chrome.tabs.onUpdated.addListener(function updateTitle(tabId, changeinfo, tab) {
    if (changeinfo.title) {
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
      .addClass('btn-wide')
      .addClass('btn-label')
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
    
    if (tab.pinned) {
      saveBtn
        .addClass('btn-default')
        .addClass('disabled');
    } else {
      btnGrp.addClass('movable');
      saveBtn
        .addClass('btn-warning')
        .click(function() {
          var context = this;
          chrome.bookmarks.search({
            url: context.href
          }, function(searchResults) {
            if (searchResults.length === 0) {
              chrome.bookmarks.get(catDropdown.selected, function(results) {
                if (results.length > 0) {
                  chrome.bookmarks.create({
                    title: context.title,
                    url: context.href,
                    parentId: results[0].id
                  }, function(createdBookmark) {
                    renderBookmark(createdBookmark, $('#bookmarkContainer'), true);
                    btnGrp.remove();
                    chrome.tabs.remove(tab.id);
                    scrollPad();
                  });
                }
              });
            }
          });
        });
    }

    return btnGrp;
  }

  function renderCategories(bookmarks, categoryContainer) {
    let selectedId = window.localStorage.getItem('silver_telegram_selected');;
    catDropdown = new Dropdown('Category: {item} ', categoryContainer);
    bookmarks.map(function(bookmark) {
      var category = catDropdown.addItem(bookmark.title, selectCategory, bookmark.id);
      chrome.bookmarks.getChildren(bookmark.id, function(children) {
        category.data({items: []});
        children.map(function(child) {
          if (child.url) {
            category.data().items.push(renderBookmark(child, $('#bookmarkContainer')));
          }
        });
        if (selectedId === bookmark.id) {
          selectCategory.apply(category[0]);
          catDropdown.selectItem(bookmark.title, bookmark.id);
        }
      });
    });
    catDropdown.addBtnListener(createCategory);
  }

  function selectCategory() {
    $('#bookmarkContainer').children().hide();
    let items = $(this).data().items;
    if (items && items.map) {
      items.map(function(item) {
        item.show();
      });
    }
    scrollPad();
  }

  function renderBookmark(bookmark, container, show) {
    let btnGrp = $('<div/>')
      .addClass('btn-group')
      .addClass('movable')
      .addClass('btn-group-xs')
      .addClass('pad-top')
      .attr('role', 'group')
      .attr('aria-label', '...')
      .appendTo(container);

    if (!show) {
      btnGrp.hide();
    }
      
    $('<a/>')
      .addClass('btn')
      .addClass('btn-warning')
      .data('bookmark', bookmark)
      .attr('role', 'button')
      .click(bookmarkToTab)
      .click(bookmarkRemove)
      .appendTo(btnGrp).append($('<span/>')
        .addClass('glyphicon')
        .addClass('glyphicon-arrow-left')
      )
      
    $('<a/>')
      .addClass('btn')
      .addClass('btn-default')
      .addClass('btn-medium')
      .addClass('btn-label')
      .data('bookmark', bookmark)
      .attr('role', 'button')
      .text(bookmark.title)
      .click(bookmarkToTab)
      .appendTo(btnGrp);
      
    $('<a/>')
      .addClass('btn')
      .addClass('btn-danger')
      .attr('role', 'button')
      .data('bookmark', bookmark)
      .click(bookmarkRemove)
      .appendTo(btnGrp).append($('<span/>')
        .addClass('glyphicon')
        .addClass('glyphicon-remove')
      )

    return btnGrp;
  }
  
  function bookmarkToTab() {
    chrome.tabs.create({
      url: $(this).data('bookmark').url,
      active: false
    }, function(tab) {
      renderTab(tab, $('#tabContainer'));
      scrollPad();
    });
  }
  
  function bookmarkRemove() {
    chrome.bookmarks.remove($(this).data('bookmark').id);
    let btnGrp = $(this).parentsUntil('#tabContainer').filter('.btn-group');
    btnGrp.remove();
    scrollPad();
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
      chrome.bookmarks.getChildren(rootBookmark.id, function(bookmarks) {
        callback([rootBookmark].concat(bookmarks.filter(function(bookmark) {
          return bookmark.url == null;
        })));
      });
    });
  }
  
  function getRootBookmark(callback) {
    chrome.bookmarks.search({
      title: 'Silver Telegram',
      url: null
    }, function(bookmarks) {
      if (bookmarks.length > 0) {
        callback(bookmarks[0]);
      } else {
        chrome.bookmarks.create({
          title: 'Silver Telegram',
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
    var item = catDropdown.addItem(catName, selectCategory);
    getRootBookmark(function(rootBookmark) {
      chrome.bookmarks.create({
        title: catName,
        url: null,
        parentId: rootBookmark.id
      }, function(createdBookmark) {
          selectCategory.apply(item[0]);
          catDropdown.selectItem(catName, createdBookmark.id);
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
        .addClass('btn-wide')
        .addClass('btn-label')
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
      if (typeof itemValue == 'undefined') {
        var itemValue = itemTitle;
      }
      
      let item = $('<a/>')
        .val(itemValue)
        .text(itemTitle)
        .attr('id', itemValue)
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
      
      return item;
    }
    
    selectItem(itemTitle, itemValue) {
      if (typeof itemValue == 'undefined') {
        var itemValue = itemTitle;
      }
      
      window.localStorage.setItem('silver_telegram_selected', itemValue);
      if (this.dropdown.find('li>a').filter(function() {return $(this).val() == itemValue}).length < 1) {
        throw 'Cannot select item "' + itemTitle + '" - not found';
      }
      this.selected = itemValue;
      this.labelSpan.text(this.title.replace('{item}', itemTitle));
    }
  }
})();
