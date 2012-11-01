const tabs = require("tabs");

tabs.on('activate', function(tab) {
	tab.attach({
		contentScript: 'self.postMessage(document.body.innerHTML);',
		onMessage: function (message) {
			console.log('tab activate');
			console.log(message);
		}
	});
});