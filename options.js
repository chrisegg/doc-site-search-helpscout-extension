// Load saved settings on page load
document.addEventListener("DOMContentLoaded", function () {
	chrome.storage.sync.get("copyAsHyperlink", function (data) {
		document.getElementById("copyAsHyperlink").checked = data.copyAsHyperlink || false;
	});

	document.getElementById("copyAsHyperlink").addEventListener("change", function () {
		chrome.storage.sync.set({ copyAsHyperlink: this.checked });
	});
});
