(function (){
  var catDropdown = null;

  function updateLayout() {
    if ($('#tabContainer').parent().outerHeight(true) > window.innerHeight+1 || $('#categoryContainer').parent().outerHeight(true) > window.innerHeight+1) {
      $('body').addClass('scroll-pad');
    } else {
      $('body').removeClass('scroll-pad');
    }
    chrome.tabs.query({
      currentWindow: true
    }, function(tabs) {
      tabs.map(function(tab) {
        let saveBtn = $('a#savetab-' + tab.id);
        if (tab.pinned) {
          disableSaveBtn(saveBtn)
        } else {
          chrome.bookmarks.search({
            url: tab.url
          }, function(bookmarks) {
            if (bookmarks.length > 0) {
              disableSaveBtn(saveBtn);
            } else {
              enableSaveBtn(saveBtn);
            }
          });
        }
      });
    });
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

    $('body').on('keyup', '#search', function() {
      let val = $(this).val();
      if (val.length > 2) {
        filterTabItems(val);
        filterBookmarkItems(val);
      } else {
        filterTabItems('');
        filterBookmarkItems('');
      }
      updateLayout();
    });

    $('body').on('click', '#clearSearch', function() {
      $('#search').val('');
      filterTabItems('');
      filterBookmarkItems('');
      updateLayout();
    });

    $('body').on('click', '#deleteCategory', deleteCategory);

    $('body').on('click', '#saveAll', function() {
      $('#tabContainer a.saveBtn').each(function(idx, item) {
        if (!$(item).hasClass('disabled')){
          tabToBookmark.apply(item, [null, true]);
        }
      });
    });

    $('body').on('click', '#saveAllNewCat', function(event) {
      $('body').one('click', '#createCategory', function() {
        createCategory($('#newCategoryInput').val(), function(){
          $('#tabContainer a.saveBtn').each(function(idx, item) {
            if (!$(item).hasClass('disabled')){
              tabToBookmark.apply(item, [null, true]);
            }
          });
        });
        $('#newCategoryInput').val('');
      });
    });

    $('body').on('click', '#addCatBtn', function(event) {
      $('body').one('click', '#createCategory', function() {
        createCategory($('#newCategoryInput').val());
        $('#newCategoryInput').val('');
      });
    });

    $('body').on('click', '#openAll', function() {
      $('#bookmarkContainer a.btn-label').filter(':visible').each(function(idx, item) {
        bookmarkToTab.apply(item);
      });
    });

    $('body').on('click', '#openAllNewWin', function() {
      chrome.windows.create(function(newWin) {
        $('#bookmarkContainer a.btn-label').filter(':visible').each(function(idx, item) {
          if (idx === 0 && newWin.tabs.length === 1 && newWin.tabs[0].url === 'chrome://newtab/') {
            bookmarkToTab.apply(item, [null, newWin.id, newWin.tabs[0].id]);
          } else {
            bookmarkToTab.apply(item, [null, newWin.id]);
          }
        });
      })
    });

    $('#bookmarkContainer').sortable({
      scroll: false,
      start: sortStart,
      stop: sortStopBookMark,
      over: over,
      items: '.movable',
      connectWith: '#tabContainer'
    });
    $('#bookmarkContainer').disableSelection();
    $('#tabContainer').sortable({
      scroll: false,
      start: sortStart,
      stop: sortStopTab,
      over: over,
      items: '.movable',
      connectWith: '#bookmarkContainer'
    });
    $('#tabContainer').disableSelection();
  });

  function sortStart(event, ui) {
    $(window).disablescroll();
    ui.item.css('margin-top', window.pageYOffset);
  }

  function over(event, ui) {
    ui.item.css('margin-top', window.pageYOffset);
  }

  function sortStopBookMark(event, ui) {
    sortStop(event, ui);
    $('#bookmarkContainer').children('.btn-group:visible').each(function(idx, item) {
      let bookmark = $(item).data('bookmark');
      chrome.bookmarks.move(bookmark.id, { index: idx });
    });
    if (ui.item.parent('#tabContainer').length > 0) {
      let item = ui.item.children('a.btn-label')[0];
      bookmarkToTab.apply(item, [null, null, null, ui.item.next()]);
      bookmarkRemove.apply(item);
    }
  }

  function sortStopTab(event, ui) {
    sortStop(event, ui);
    refreshTabOrder();
    if (ui.item.parent('#bookmarkContainer').length > 0) {
      let item = ui.item.children('a.btn-label')[0];
    }
  }

  function refreshTabOrder() {
    $('#tabContainer').children('.btn-group:visible').each(function(idx, item) {
      let tab = $(item).data('tab');
      chrome.tabs.move(tab.id, { index: idx });
    });
  }

  function sortStop(event, ui) {
    $(window).disablescroll('undo');
    ui.item.css('margin-top', 0);
  }

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
    updateLayout();
  }

  chrome.tabs.onUpdated.addListener(function updateTitle(tabId, changeinfo, tab) {
    if (changeinfo.title || changeinfo.favIconUrl) {
      let label = $('#tab-' + tabId);
      label.text(tab.title);
      $('#savetab-' + tabId).attr('title', tab.title);
      favIconHtml(tab.favIconUrl, label);
    }
  });

  function favIconHtml(favIconUrl, container) {
    if (favIconUrl in favIconMap) {
      favIconUrl = favIconMap[favIconUrl];
    } else if (favIconUrl && (typeof favIconUrl !== 'string' || !(favIconUrl.startsWith('http') || favIconUrl.startsWith('data')))) {
      favIconUrl = null;
    }
    if (favIconUrl) {
      $('<img/>')
        .attr('src', favIconUrl)
        .addClass('favIcon')
        .prependTo(container);
    } else {
      $('<span/>')
        .addClass('favIcon')
        .addClass('favIconSpacer')
        .prependTo(container);
    }
  }

  function renderTab(tab, container, beforeEl) {
    let btnGrp = $('<div/>')
      .addClass('btn-group')
      .addClass('btn-group-xs')
      .addClass('pad-top')
      .data('tab', tab)
      .attr('role', 'group')
      .attr('aria-label', '...');

    if (beforeEl) {
      btnGrp.insertBefore(beforeEl);
    } else {
      btnGrp.appendTo(container);
    }

    let title = tab.title;
    if (tab.status === 'loading') {
      if (!title) {
        title = 'Loading ...';
      }
    }

    let closeBtn = $('<a/>')
      .addClass('btn')
      .attr('role', 'button')
      .attr('href', tab.url)
      .attr('title', tab.title)
      .appendTo(btnGrp).append($('<span/>')
        .addClass('glyphicon')
        .addClass('glyphicon-remove')
      );

    let label = $('<a/>')
      .addClass('btn')
      .addClass('btn-default')
      .addClass('btn-medium')
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

    favIconHtml(tab.favIconUrl, label);

    let saveBtn = $('<a/>')
      .addClass('btn')
      .addClass('saveBtn')
      .attr('role', 'button')
      .attr('href', tab.url)
      .attr('title', tab.title)
      .attr('id', 'savetab-' + tab.id)
      .data('tab', tab)
      .appendTo(btnGrp).append($('<span/>')
        .addClass('glyphicon')
        .addClass('glyphicon-arrow-right')
      );

    if (tab.pinned) {
      closeBtn
        .addClass('btn-default')
        .addClass('disabled');
    } else {
      btnGrp.addClass('movable');
      closeBtn
        .addClass('btn-danger')
        .click(function() {
          btnGrp.remove();
          chrome.tabs.remove(tab.id);
          updateLayout();
        });
    }

    return btnGrp;
  }

  function disableSaveBtn(saveBtn) {
    saveBtn
      .removeClass('btn-warning')
      .addClass('btn-default')
      .addClass('disabled')
      .off();
  }

  function enableSaveBtn(saveBtn) {
    saveBtn
      .removeClass('btn-default')
      .addClass('btn-warning')
      .removeClass('disabled')
      .one('click', tabToBookmark);
  }

  function tabToBookmark(event, keepTab, index) {
    var context = this;
    if (event && typeof event.stopImmediatePropagation == 'function') {
      event.stopImmediatePropagation();
    }
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
              if (!keepTab) {
                $(context).parent().remove();
                chrome.tabs.remove(parseInt($(context).attr('id').split('-')[1]));
              }
              updateLayout();
            });
          }
        });
      }
    });
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
  }

  function selectCategory() {
    $('#bookmarkContainer').children().hide();
    let items = $(this).data().items;
    if (items && items.map) {
      items.map(function(item) {
        item.show();
      });
    }
    updateLayout();
  }

  function renderBookmark(bookmark, container, show) {
    let btnGrp = $('<div/>')
      .addClass('btn-group')
      .addClass('btn-group-xs')
      .addClass('pad-top')
      .addClass('movable')
      .data('bookmark', bookmark)
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

    let label = $('<a/>')
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

  function bookmarkToTab(event, windowId, tabId, beforeEl) {
    if (tabId) {
      chrome.tabs.update(tabId, {
        url: $(this).data('bookmark').url
      });
    } else {
      chrome.tabs.create({
        url: $(this).data('bookmark').url,
        active: false,
        windowId: windowId
      }, function(tab) {
        if (!windowId) {
          renderTab(tab, $('#tabContainer'), beforeEl);
          updateLayout();
        }
      });
    }
  }

  function bookmarkRemove() {
    chrome.bookmarks.remove($(this).data('bookmark').id);
    let btnGrp = $(this).parentsUntil('#tabContainer').filter('.btn-group');
    btnGrp.remove();
    updateLayout();
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

  function deleteCategory(category) {
    catDropdown.removeItem(catDropdown.selected);
    chrome.bookmarks.removeTree(catDropdown.selected);
    catDropdown.selectDefault();
  }

  function createCategory(catName, callback) {
    getRootBookmark(function(rootBookmark) {
      chrome.bookmarks.create({
        title: catName,
        url: null,
        parentId: rootBookmark.id
      }, function(createdBookmark) {
          let item = catDropdown.addItem(catName, selectCategory, createdBookmark.id);
          selectCategory.apply(item[0]);
          catDropdown.selectItem(catName, createdBookmark.id);
          if (typeof callback === 'function') {
            callback();
          }
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
        .attr('id', 'addCatBtn')
        .attr('data-toggle', 'modal')
        .attr('data-target', '#addCategoryModal')
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
        .addClass('btn-medium')
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

      this.delCatBtn = $('<a/>')
        .attr('role', 'button')
        .addClass('btn')
        .addClass('btn-danger')
        .attr('data-toggle', 'modal')
        .attr('data-target', '#delCategoryModal')
        .appendTo(btnGroup).append($('<span/>')
          .addClass('glyphicon')
          .addClass('glyphicon-remove')
        );

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

    removeItem(itemValue) {
      this.dropdown.find('#'+itemValue).remove();
    }

    selectItem(itemTitle, itemValue) {
      if (typeof itemValue == 'undefined') {
        var itemValue = itemTitle;
      }

      window.localStorage.setItem('silver_telegram_selected', itemValue);
      if (this.dropdown.find('li>a#'+itemValue).length < 1) {
        throw 'Cannot select item "' + itemTitle + '" - not found';
      }
      this.selected = itemValue;
      this.labelSpan.text(this.title.replace('{item}', itemTitle));
    }

    selectDefault() {
      let item = this.dropdown.find('li>a').first();
      if (item.length > 0) {
        this.selectItem(item.text(), item.val());
        item.click();
      }
    }
  }

  var favIconMap = {
    'chrome://theme/IDR_EXTENSIONS_FAVICON@2x': 'IDR_EXTENSIONS_FAVICON@2x.png',
    'chrome://theme/IDR_SETTINGS_FAVICON@2x': 'IDR_SETTINGS_FAVICON@2x.png',
    'chrome://theme/IDR_PRODUCT_LOGO_16@2x': 'IDR_PRODUCT_LOGO_16@2x.png'
  };
})();
