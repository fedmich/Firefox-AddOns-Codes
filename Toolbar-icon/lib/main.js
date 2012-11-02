// This is an active module of the fedmich (2) Add-on
exports.main = function() {
    
    var data = require("self").data;
    var toolbarbutton = require("toolbarbutton");
    
    var gmail = toolbarbutton.ToolbarButton({
        id: "toolman-gmail",
        label: "Gmail",
        image: data.url("gmail.gif"),
        onCommand: function (e) {
            require("tabs").open('http://gmail.com');
        },
        onClick: function(e){
            if (e.button == 1)
                require("tabs").open({url: 'http://gmail.com', inBackground: true});
        }
    });
    
    gmail.moveTo({
        toolbarID: "nav-bar",
        forceMove: false 
    });

};