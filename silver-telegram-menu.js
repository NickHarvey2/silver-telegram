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
        try {
          let doc = document.implementation.createDocument('http://www.w3.org/1999/xml', '', null);
          let xmlObjRep = results.map(buildXmlRepresentation, doc);
          let xmlStrRep = new XMLSerializer().serializeToString(doc);
          alert(xmlStrRep);
          chrome.windows.create({
            url: 'about:blank'
          });
        } catch (err) {
          alert(err);
        }
      });
    }
  });

  function buildXmlRepresentation(xmlObjRep) {
    // TODO
    return {};
  }
})();
