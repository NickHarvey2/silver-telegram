(function (){
  chrome.runtime.onInstalled.addListener(function() {
    chrome.contextMenus.create({
      title: 'Export Bookmarks',
      id: 'fa46ea8e-a358-4b09-be55-901083769c45',
      contexts: ['browser_action']
    });
  });

  chrome.contextMenus.onClicked.addListener(function(info, tab) {
    if (info.menuItemId === 'fa46ea8e-a358-4b09-be55-901083769c45') {
      chrome.bookmarks.getTree(function(results) {
        console.log(results.map(bookmarkTreeNodeToXml).join('\n'));
      });
    }
  });

  function bookmarkTreeNodeToXml(bookmarkTreeNode) {
    let retVal = '<DT>';
    if (bookmarkTreeNode.url) {
      retVal += '<A HREF="';
      retVal += bookmarkTreeNode.url;
      retVal += '" ADD_DATE="';
      retVal += bookmarkTreeNode.dateAdded;
      retVal += '" ICON="';
      retVal += ''; // TODO
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
      retVal += '</H3>\n<DL><p>\n';
      retVal += bookmarkTreeNode.children.map(bookmarkTreeNodeToXml).join('\n');
    }
    return retVal;
  }
})();
