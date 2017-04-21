(function (){

  var catDropdown = null;
  var zoom;

  document.addEventListener('contextmenu', event => {
    $('.contextMenu').remove();
    let menuOptions = $(event.target).data('menuOptions')
    if (menuOptions) {
      openMenu(menuOptions, event);
    }
    event.preventDefault();
  });

  function openMenu(menuOptions, event) {
    $(document).one('click', function(event) {
      $('.contextMenu').remove();
    });
    let menu = $('<div/>')
      .addClass('list-group')
      .addClass('contextMenu')
      .css('top', `${event.clientY}px`)
      .css('left', `${event.clientX}px`)
      .css('visibility', 'hidden');
    let item = $(event.target);
    menuOptions.map(option => {
      $('<button/>')
        .addClass('list-group-item')
        .text(typeof option.title == 'function' ? option.title.apply(item) : option.title)
        .appendTo(menu)
        .click(event => {
          if (typeof option.action == 'function') {
            option.action.apply(item);
          }
        });
    });
    $('body').append(menu);
    if (event.clientY + menu.height() > window.innerHeight) {
      menu.css('top', `${event.clientY - menu.height()}px`);
    }
    if (event.clientX + menu.width() > window.innerWidth) {
      menu.css('left', `${event.clientX - menu.width()}px`);
    }
    menu.css('visibility', 'visible');
  }

  function updateLayout() {
    if ($('#tabContainer').parent().outerHeight(true) > window.innerHeight+1 || $('#categoryContainer').parent().outerHeight(true) > window.innerHeight+1) {
      $('body').addClass('scroll-pad');
    } else {
      $('body').removeClass('scroll-pad');
    }
    if ($('#bookmarkContainer').children('.btn-group:visible').length === 0) {
      $('#openAll').addClass('disabled');
      $('#openAllNewWin').addClass('disabled');
    } else {
      $('#openAll').removeClass('disabled');
      $('#openAllNewWin').removeClass('disabled');
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

    $('body').on('keyup', '#search', function(event) {
      let val = $(this).val();
      if (val.length > 2) {
        filterTabItems(val);
        filterBookmarkItems(val);
      } else {
        filterTabItems('');
        filterBookmarkItems('');
      }
      updateLayout();
      if (event.which == 13 && val.length > 2) {
        bookmarkToTab.apply($('#bookmarkContainer').children('.btn-group').filter(':visible').first().children('.btn-label'), [null, null, null, null, function(tab) {
          chrome.tabs.update(tab.id, {active: true});
        }]);
      }
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
      connectWith: '#tabContainer',
      distance: 5
    });
    $('#bookmarkContainer').disableSelection();
    $('#tabContainer').sortable({
      scroll: false,
      start: sortStart,
      stop: sortStopTab,
      over: over,
      items: '.movable',
      connectWith: '#bookmarkContainer',
      distance: 5
    });
    $('#tabContainer').disableSelection();

    $('body').on('click', '#addCatBtn', function(event) {
      $('body').one('click', '#createCategory', createCategoryAndCloseDialog);
    });

    $('.modal[role="dialog"]').on('shown.bs.modal', function() {
      $(this).find('input').first().focus();
      $('body').on('keyup', '.modal[role="dialog"] input:visible', createCategoryEventHandler);
    });

    $('#search').focus();
  });

  function createCategoryEventHandler(event) {
    if (event.which == 13 && $(this).val() && $(this).val().length > 0) {
      $('body').off('keyup', '.modal[role="dialog"] input:visible', createCategoryEventHandler);
      createCategoryAndCloseDialog();
    }
  }

  function createCategoryAndCloseDialog() {
    $('body').off('click', '#createCategory', createCategoryAndCloseDialog);
    createCategory($('#newCategoryInput').val());
    $('#newCategoryInput').val('');
    $('.modal[role="dialog"]').modal('hide');
  }

  function sortStart(event, ui) {
    $(window).disablescroll();
    ui.item.css('margin-top', window.pageYOffset);
  }

  function over(event, ui) {
    ui.item.css('margin-top', window.pageYOffset);
  }

  function sortStopBookMark(event, ui) {
    sortStop(event, ui);
    if (ui.item.parent('#tabContainer').length > 0) {
      let item = ui.item.children('a.btn-label')[0];
      bookmarkToTab.apply(item, [null, null, null, ui.item.next(), refreshTabOrder]);
      bookmarkRemove.apply(item);
    }
    refreshBookmarkOrder();
  }

  function sortStopTab(event, ui) {
    sortStop(event, ui);
    if (ui.item.parent('#bookmarkContainer').length > 0) {
      let $item = ui.item.children('a.saveBtn');
      if (!$item.hasClass('disabled')) {
        tabToBookmark.apply($item[0], [null, false, ui.item.next(), refreshBookmarkOrder]);
      } else {
        $("#tabContainer").sortable("cancel");
        return;
      }
    }
    refreshTabOrder();
  }

  function refreshTabOrder() {
    $('#tabContainer').children('.btn-group:visible').each(function(idx, item) {
      let tab = $(item).data('tab');
      chrome.tabs.move(tab.id, { index: idx });
    });
  }

  function refreshBookmarkOrder() {
    $('#bookmarkContainer').children('.btn-group:visible').each(function(idx, item) {
      let bookmark = $(item).data('bookmark');
      chrome.bookmarks.move(bookmark.id, { index: idx });
    });
  }

  function sortStop(event, ui) {
    $(window).disablescroll('undo');
    ui.item.css('margin-top', 0);
  }

  function filterTabItems(filterString) {
    if (filterString) {
      $('#tabContainer').children('.btn-group').each(function(idx, item) {
        if ($(item).children('.btn-label').text().toUpperCase().search(filterString.toUpperCase()) >= 0
            || $(item).attr('title').toUpperCase().search(filterString.toUpperCase()) >= 0) {
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
        if ($(item).children('.btn-label').text().toUpperCase().search(filterString.toUpperCase()) >= 0
            || $(item).attr('title').toUpperCase().search(filterString.toUpperCase()) >= 0) {
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
    } else if (favIconUrl && (typeof favIconUrl !== 'string' || !(favIconUrl.startsWith('http') || favIconUrl.startsWith('data') || favIconUrl.startsWith('chrome')))) {
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
    let tabMenuOptions = [
      new MenuOption('Move to top', function() {
        $(this).parent().parent().find('.movable').first().before($(this).parent());
        refreshTabOrder();
      }),
      new MenuOption('Move to bottom', function() {
        $(this).parent().appendTo($(this).parent().parent());
        refreshTabOrder();
      }),
      new MenuOption('Close', function() {
        btnGrp.remove();
        chrome.tabs.remove(tab.id);
        updateLayout();
      }),
      new MenuOption('Clone', function() {
        let context = this;
        chrome.tabs.create({
          index: $(this).data('tab').index+1,
          url: $(this).data('tab').url,
          active: false
        }, function(tab) {
          renderTab(tab, $('#tabContainer'), $('#tabContainer').children(`:nth-child(${$(context).data('tab').index+1})`));
          // TODO?
          updateLayout();
        });
      }),
      new MenuOption(function() {
        return $(this).data('tab').pinned ? 'Unpin' : 'Pin';
      }),
      new MenuOption('Refresh', function() {
        // TODO
      }),
      new MenuOption('Save', function() {
        // TODO
      }),
      new MenuOption('Save + Close', function() {
        // TODO
      })
    ];

    let btnGrp = $('<div/>')
      .addClass('btn-group')
      .addClass('btn-group-xs')
      .addClass('pad-top')
      .data('tab', tab)
      .attr('role', 'group')
      .attr('title', tab.url)
      .attr('aria-label', '...');

    if (beforeEl && beforeEl.length > 0) {
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
      .data('href', tab.url)
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
      .data('tab', tab)
      .data('menuOptions', tabMenuOptions)
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
      .data('href', tab.url)
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

  function tabToBookmark(event, keepTab, beforeEl, callback) {
    var context = this;
    if (event && typeof event.stopImmediatePropagation == 'function') {
      event.stopImmediatePropagation();
    }
    chrome.bookmarks.search({
      url: $(context).data('href')
    }, function(searchResults) {
      if (searchResults.length === 0) {
        chrome.bookmarks.get(catDropdown.selected, function(results) {
          if (results.length > 0) {
            chrome.bookmarks.create({
              title: context.title,
              url: $(context).data('href'),
              parentId: results[0].id
            }, function(createdBookmark) {
              renderBookmark(createdBookmark, $('#bookmarkContainer'), true, beforeEl);
              if (!keepTab) {
                $(context).parent().remove();
                chrome.tabs.remove(parseInt($(context).attr('id').split('-')[1]));
              }
              updateLayout();
              if (typeof callback === 'function') {
                callback(createdBookmark);
              }
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

  function renderBookmark(bookmark, container, show, beforeEl) {
    let bookmarkMenuOptions = [
      new MenuOption('Move to top', function() {
        $(this).parent().prependTo($(this).parent().parent());
        refreshBookmarkOrder();
      }),
      new MenuOption('Move to bottom', function() {
        $(this).parent().appendTo($(this).parent().parent());
        refreshBookmarkOrder();
      }),
      new MenuOption('Move to category', function() {
        // TODO
      }),
      new MenuOption('Rename', function() {
        // TODO
      }),
      new MenuOption('Remove', bookmarkRemove),
      new MenuOption('Open', function() {
        bookmarkToTab.apply(this)
      }),
      new MenuOption('Open + Remove', function() {
        bookmarkToTab.apply(this, [null, null, null, null, function() {
          bookmarkRemove.apply(this);
        }])
      })
    ];

    let btnGrp = $('<div/>')
      .addClass('btn-group')
      .addClass('btn-group-xs')
      .addClass('pad-top')
      .addClass('movable')
      .data('bookmark', bookmark)
      .attr('role', 'group')
      .attr('title', bookmark.url)
      .attr('aria-label', '...')
      .appendTo(container);

    if (beforeEl && beforeEl.length > 0) {
      btnGrp.insertBefore(beforeEl);
    } else {
      btnGrp.appendTo(container);
    }

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
      .data('menuOptions', bookmarkMenuOptions)
      .attr('role', 'button')
      .text(bookmark.title)
      .click(bookmarkToTab)
      .appendTo(btnGrp);

    favIconHtml('chrome://favicon/' + bookmark.url, label);

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

  function bookmarkToTab(event, windowId, tabId, beforeEl, callback) {
    if (tabId) {
      chrome.tabs.update(tabId, {
        url: $(this).data('bookmark').url
      });
    } else {
      let context = this;
      chrome.tabs.create({
        url: $(this).data('bookmark').url,
        active: false,
        windowId: windowId
      }, function(tab) {
        if (!windowId) {
          renderTab(tab, $('#tabContainer'), beforeEl);
          updateLayout();
          if (typeof callback === 'function') {
            callback.apply(context, [tab]);
          }
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

  class MenuOption {
    constructor(title, action) {
      this.title = title;
      this.action = action;
      this.children = [];
    }

    setAction(action) {
      this.action = action;
    }

    setTitle(title) {
      this.title = title;
    }

    getChildren() {
      return this.children;
    }

    addChild(child) {
      this.children.push(child);
    }

    addChildren(children) {
      children.map(child => this.children.push(child));
    }

    removeChild(child) {
      this.children.pop(indexOf(child));
    }
  }

  var favIconMap = {
    'chrome://theme/IDR_EXTENSIONS_FAVICON@2x': 'IDR_EXTENSIONS_FAVICON@2x.png',
    'chrome://theme/IDR_SETTINGS_FAVICON@2x': 'IDR_SETTINGS_FAVICON@2x.png',
    'chrome://theme/IDR_PRODUCT_LOGO_16@2x': 'IDR_PRODUCT_LOGO_16@2x.png'
  };
})();
