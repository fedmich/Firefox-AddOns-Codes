const NS_XUL = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

var {unload} = require("unload+");
var {listen} = require("listen");

exports.ToolbarButton = function ToolbarButton(options) {
  var unloaders = [],
      toolbarID = "",
      insertbefore = "",
      destroyed = false,
      destoryFuncs = [];

  var delegate = {
    onTrack: function (window) {
      if ("chrome://browser/content/browser.xul" != window.location || destroyed)
        return;

      let doc = window.document;
      function $(id) doc.getElementById(id);
      function xul(type) doc.createElementNS(NS_XUL, type);

      // create toolbar button
      let tbb = xul("toolbarbutton");
      tbb.setAttribute("id", options.id);
      tbb.setAttribute("type", (options.type == "unsorted" || options.type == "tabs-undo") ? "menu" : "button");
      if (options.type == "unsorted"){
          tbb.setAttribute("oncommand", "BookmarksEventHandler.onCommand(event);");
          tbb.setAttribute("onclick", "BookmarksEventHandler.onClick(event);");
          let menupopup = xul("menupopup");
          menupopup.setAttribute('placespopup', 'true');
          menupopup.setAttribute('context', 'placesContext');
          menupopup.setAttribute('onpopupshowing', "if (!this.parentNode._placesView) new PlacesMenu(event, 'place:folder=UNFILED_BOOKMARKS');");
          tbb.appendChild(menupopup);
      }
      if (options.type == "tabs-undo"){
          let menupopup = xul("menupopup");
          menupopup.addEventListener("command", function(event){
                var tabs = require("tabs");
                tabs.open(event.originalTarget.value);
          })
          menupopup.addEventListener("popupshowing", function(){
              while (menupopup.firstChild)
                  menupopup.removeChild(menupopup.firstChild);
              var list = (options.undoList.length ? options.undoList : [["No closed tab yet!", "about:blank"]]);
              for (var i = list.length - 1; i >= 0; i--) {
                  menuitem = doc.createElement('menuitem');
                  menuitem.setAttribute('label', list[i][0]);
                  menuitem.setAttribute('value', list[i][1]);
                  menupopup.appendChild(menuitem) 
              }
          }, true);  
          tbb.appendChild(menupopup);
      }
      if (options.image) tbb.setAttribute("image", options.image);
      if (options.context) tbb.setAttribute("context", options.context);
      tbb.setAttribute("class", "toolbarbutton-1 chromeclass-toolbar-additional");
      tbb.setAttribute("orient", "horizontal");
      tbb.setAttribute("label", options.label);
      tbb.addEventListener("command", function() {
        if (options.onCommand)
          options.onCommand({}); // TODO: provide something?

        if (options.panel) {
          options.panel.show(tbb);
        }
      }, true);
      if (options.onClick && options.type != "unsorted")
          tbb.addEventListener("click", options.onClick, true);    

      // add toolbarbutton to palette
      ($("navigator-toolbox") || $("mail-toolbox")).palette.appendChild(tbb);

      // find a toolbar to insert the toolbarbutton into
      if (toolbarID) {
        var tb = $(toolbarID);
      }
      if (!tb) {
        var tb = toolbarbuttonExists(doc, options.id);
      }

      // found a toolbar to use?
      if (tb) {
        let b4;

        // find the toolbarbutton to insert before
        if (insertbefore) {
          b4 = $(insertbefore);
        }
        if (!b4) {
          let currentset = tb.getAttribute("currentset").split(",");
          let i = currentset.indexOf(options.id) + 1;

          // was the toolbarbutton id found in the curent set?
          if (i > 0) {
            let len = currentset.length;
            // find a toolbarbutton to the right which actually exists
            for (; i < len; i++) {
              b4 = $(currentset[i]);
              if (b4) break;
            }
          }
        }

        tb.insertItem(options.id, b4, null, false);
      }

      var saveTBNodeInfo = function(e) {
        toolbarID = tbb.parentNode.getAttribute("id") || "";
        insertbefore = (tbb.nextSibling || "")
            && tbb.nextSibling.getAttribute("id").replace(/^wrapper-/i, "");
      };

      window.addEventListener("aftercustomization", saveTBNodeInfo, false);

      // add unloader to unload+'s queue
      var unloadFunc = function() {
        tbb.parentNode.removeChild(tbb);
        window.removeEventListener("aftercustomization", saveTBNodeInfo, false);
      };
      var index = destoryFuncs.push(unloadFunc) - 1;
      listen(window, window, "unload", function() {
        destoryFuncs[index] = null;
      }, false);
      unloaders.push(unload(unloadFunc, window));
    },
    onUntrack: function (window) {}
  };
  var winUtils = require("window-utils");
  var tracker = new winUtils.WindowTracker(delegate);

  return {
    destroy: function() {
      if (destroyed) return;
      destroyed = true;

      if (options.panel)
        options.panel.destroy();

      // run unload functions
      destoryFuncs.forEach(function(f) f && f());
      destoryFuncs.length = 0;

      // remove unload functions from unload+'s queue
      unloaders.forEach(function(f) f());
      unloaders.length = 0;
    },
    moveTo: function(pos) {
      if (destroyed) return;

      // record the new position for future windows
      toolbarID = pos.toolbarID;
      insertbefore = pos.insertbefore;

      // change the current position for open windows
      for each (var window in winUtils.windowIterator()) {
        if ("chrome://browser/content/browser.xul" != window.location) return;

        let doc = window.document;
        let $ = function (id) doc.getElementById(id);

        // if the move isn't being forced and it is already in the window, abort
        if (!pos.forceMove && $(options.id)) return;

        var tb = $(toolbarID);
        var b4 = $(insertbefore);

        // TODO: if b4 dne, but insertbefore is in currentset, then find toolbar to right

        if (tb) tb.insertItem(options.id, b4, null, false);
      };
    }
  };
};

function toolbarbuttonExists(doc, id) {
  var toolbars = doc.getElementsByTagNameNS(NS_XUL, "toolbar");
  for (var i = toolbars.length - 1; ~i; i--) {
    if ((new RegExp("(?:^|,)" + id + "(?:,|$)")).test(toolbars[i].getAttribute("currentset")))
      return toolbars[i];
  }
  return false;
}