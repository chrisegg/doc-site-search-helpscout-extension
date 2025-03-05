document.addEventListener("DOMContentLoaded", function () {
	console.log("🔹 popup.js loaded");

	let toggleSwitch = document.getElementById("copyAsMarkdown");

	if (toggleSwitch) {
		// Load saved setting
		chrome.storage.sync.get(["copyAsMarkdown"], function (data) {
			toggleSwitch.checked = !!data.copyAsMarkdown;
			console.log("🔹 Loaded setting:", toggleSwitch.checked);
		});

		// Save setting on change
		toggleSwitch.addEventListener("change", function () {
			chrome.storage.sync.set({ copyAsMarkdown: toggleSwitch.checked }, function () {
				console.log("✅ Setting saved:", toggleSwitch.checked);
			});
		});
	} else {
		console.error("❌ Toggle switch element not found in popup.html");
	}
});