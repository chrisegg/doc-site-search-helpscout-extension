// Command + J for macOS and Control + J for Windows
document.addEventListener("keydown", function (event) {
	const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
	const isShortcut = (isMac && event.metaKey && event.key.toLowerCase() === "j") ||
					   (!isMac && event.ctrlKey && event.key.toLowerCase() === "j");

	if (isShortcut) {
		openSearchBox();
	}
});

// Open standalone search box
function openSearchBox() {
	let searchBox = document.getElementById("gf-search-box");
	if (!searchBox) {
		searchBox = document.createElement("div");
		searchBox.id = "gf-search-box";
		searchBox.style.position = "fixed";
		searchBox.style.top = "50%";
		searchBox.style.left = "50%";
		searchBox.style.transform = "translate(-50%, -50%)";
		searchBox.style.padding = "15px";
		searchBox.style.backgroundColor = "#fff";
		searchBox.style.border = "1px solid #ccc";
		searchBox.style.boxShadow = "0px 4px 6px rgba(0, 0, 0, 0.1)";
		searchBox.style.zIndex = "10000";
		searchBox.style.borderRadius = "8px";
		searchBox.style.width = "320px";
		searchBox.style.textAlign = "left";

		searchBox.innerHTML = `
			<input type='text' id='gf-search-input' placeholder='Search Gravity Forms Docs...' style='width: 100%; padding: 5px;'>
			<div id='gf-search-results' style='margin-top: 10px; max-height: 200px; overflow-y: auto;'></div>
		`;

		document.body.appendChild(searchBox);
		document.getElementById("gf-search-input").focus();
		document.getElementById("gf-search-input").addEventListener("keyup", debounce(fetchSearchResults, 300));
	}

	// Close on Escape key
	document.getElementById("gf-search-input").addEventListener("keydown", function (event) {
		if (event.key === "Escape") {
			console.log("🔹 Esc pressed: Closing search box");
			searchBox.remove();
		}
	});
}

// Fetch search results
function fetchSearchResults(event) {
	let query = event.target.value.trim();
	if (query.length < 3) return;

	console.log("🔎 Fetching search results for:", query);

	chrome.runtime.sendMessage({ type: "search", query }, function (response) {
		if (!response || !response.hits || response.hits.length === 0) {
			document.getElementById("gf-search-results").innerHTML = "<div style='padding: 8px;'>No results found</div>";
			return;
		}

		let resultsDiv = document.getElementById("gf-search-results");
		resultsDiv.innerHTML = "";

		response.hits.forEach(hit => {
			let div = document.createElement("div");
			div.className = "gf-search-result";
			div.textContent = hit.post_title;
			div.dataset.url = hit.url || hit.post_url || hit.permalink;

			div.style.padding = "5px";
			div.style.cursor = "pointer";
			div.style.borderBottom = "1px solid #ddd";

			// Clicking copies the result based on user setting
			div.addEventListener("click", function () {
				chrome.storage.sync.get(["copyAsMarkdown"], function (data) {
					let copyAsMarkdown = data.copyAsMarkdown || false; // Default: Copy URL only

					if (copyAsMarkdown) {
						copyHyperlink(hit.post_title, div.dataset.url);
					} else {
						copyText(div.dataset.url);
					}

					// Remove search box
					let searchBox = document.getElementById("gf-search-box");
					if (searchBox) searchBox.remove();

					// Show "Copied!" message
					showCopiedMessage();
				});
			});

			resultsDiv.appendChild(div);
		});
	});
}

// **Copy just the URL**
function copyText(url) {
	if (!url || url === "undefined") {
		console.error("❌ No valid URL found.");
		return;
	}
	navigator.clipboard.writeText(url).then(() => {
		console.log("✅ URL Copied:", url);
	}).catch(err => {
		console.error("❌ Failed to copy URL:", err);
	});
}

// **Copy Markdown hyperlink**
function copyHyperlink(title, url) {
	if (!url || url === "undefined") {
		console.error("❌ No valid URL found for:", title);
		return;
	}
	const formattedText = `[${title}](${url})`;
	navigator.clipboard.writeText(formattedText).then(() => {
		console.log("✅ Markdown Copied:", formattedText);
	}).catch(err => {
		console.error("❌ Failed to copy hyperlink:", err);
	});
}

// **Show "Copied!" message**
function showCopiedMessage() {
	let copiedMessage = document.createElement("div");
	copiedMessage.textContent = "Copied!";
	copiedMessage.style.position = "fixed";
	copiedMessage.style.top = "50%";
	copiedMessage.style.left = "50%";
	copiedMessage.style.transform = "translate(-50%, -50%)";
	copiedMessage.style.backgroundColor = "#000";
	copiedMessage.style.color = "#fff";
	copiedMessage.style.padding = "8px 12px";
	copiedMessage.style.borderRadius = "5px";
	copiedMessage.style.zIndex = "10001";
	copiedMessage.style.fontSize = "14px";

	document.body.appendChild(copiedMessage);
	setTimeout(() => copiedMessage.remove(), 1000);
}

// **Debounce function**
function debounce(func, delay) {
	let timeout;
	return function () {
		clearTimeout(timeout);
		timeout = setTimeout(() => func.apply(this, arguments), delay);
	};
}