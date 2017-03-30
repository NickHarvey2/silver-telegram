(function (){
  chrome.runtime.onInstalled.addListener(function() {
    chrome.contextMenus.create({
      title: 'Export Bookmarks',
      id: 'fa46ea8e-a358-4b09-be55-901083769c45',
      contexts: ['browser_action']
    });
  });

  let bookmarkFaviconMap = {};
  let levelCount = 0;

  function decrementAndCheck(callback, params) {
    levelCount--;
    if (levelCount === 0) {
      callback();
    }
  }

  chrome.contextMenus.onClicked.addListener(function(info, tab) {
    if (info.menuItemId === 'fa46ea8e-a358-4b09-be55-901083769c45') {
      chrome.bookmarks.search({}, function(bookmarks) {
        bookmarks.filter(function(bookmark) {
          return bookmark.url ? true : false;
        }).map(function(bookmark) {
          levelCount++;
          var xhr = new XMLHttpRequest();
          xhr.responseType = 'blob';
          xhr.onreadystatechange = function() {
            if (this.status === 200 && this.readyState === 4) {
              let reader = new FileReader();
              reader.onloadend = function() {
                bookmarkFaviconMap[xhr.responseURL] = reader.result;
                decrementAndCheck(saveBookmarkHTML);
              };
              reader.readAsDataURL(this.response);
            }
          };
          xhr.open('GET', 'chrome://favicon/' + bookmark.url);
          xhr.send();
        })
      });
    }
  });

  function saveBookmarkHTML() {
    chrome.bookmarks.getTree(function(results) {
      let xmlStr = '<!DOCTYPE NETSCAPE-Bookmark-file-1>\n'
        + '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n'
        + '<TITLE>Bookmarks</TITLE>\n'
        + '<H1>Bookmarks</H1>\n'
        + '<DL><p>'
        + results[0].children.map(bookmarkTreeNodeToXml, {level: 1}).join('')
        + '\n</DL><p>\n';
      let xmlFile = new File([xmlStr], 'bookmarks.html');
      let xmlFileUrl = URL.createObjectURL(xmlFile);
      chrome.downloads.download({
        url: xmlFileUrl,
        filename: 'bookmarks.html',
        saveAs: true
      }, function(downloadId) {
        URL.revokeObjectURL(xmlFileUrl);
      });
    });
  }

  function bookmarkTreeNodeToXml(bookmarkTreeNode) {
    let indent = Array(this.level).fill('\t\t').join('');
    let retVal = '\n' + indent + '<DT>';
    if (bookmarkTreeNode.url) {
      retVal += '<A HREF="';
      retVal += bookmarkTreeNode.url;
      retVal += '" ADD_DATE="';
      retVal += bookmarkTreeNode.dateAdded;
      retVal += '" ICON="';
      retVal += bookmarkFaviconMap['chrome://favicon/' + bookmarkTreeNode.url];
      retVal += '">';
      retVal += bookmarkTreeNode.title;
      retVal += '</A>';
    } else {
      retVal += '<H3 ADD_DATE="';
      retVal += bookmarkTreeNode.dateAdded;
      retVal += '" LAST_MODIFIED="';
      retVal += bookmarkTreeNode.dateGroupModified;
      retVal += '">';
      retVal += bookmarkTreeNode.title;
      retVal += '</H3>\n' + indent + '<DL><p>';
      retVal += bookmarkTreeNode.children.map(bookmarkTreeNodeToXml, {level: this.level + 1}).join('');
      retVal += '\n' + indent + '</DL><p>';
    }
    return retVal;
  }
})();
