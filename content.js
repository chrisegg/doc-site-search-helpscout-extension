// Command + J for macOS and Control + J for Windows
document.addEventListener("keydown", function (event) {
	const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
	const isShortcut = (isMac && event.metaKey && event.key.toLowerCase() === "j") ||
					   (!isMac && event.ctrlKey && event.key.toLowerCase() === "j");

	if (isShortcut) {
		openSearchBox();
	}
});

function openSearchBox() {
	injectSearchStyles(); // Ensure styles are applied before creating the search box

	let searchBox = document.getElementById("gf-search-box");
	if (!searchBox) {
		searchBox = document.createElement("div");
		searchBox.id = "gf-search-box";

		searchBox.innerHTML = `
			<!-- 🔹 Site Selection UI -->
			<div id="search-site-selector">
				<button data-site="gravityforms" class="site-button active" title="Gravity Forms">
					<img src="icons/gravityforms.png" alt="Gravity Forms">
				</button>
				<button data-site="gravityflow" class="site-button" title="Gravity Flow">
					<img src="icons/gravityflow.png" alt="Gravity Flow">
				</button>
				<button data-site="gravitysmtp" class="site-button" title="Gravity SMTP">
					<img src="icons/gravitysmtp.png" alt="Gravity SMTP">
				</button>
				<button data-site="gravitywiz" class="site-button" title="GravityWiz">
					<img src="icons/gravitywiz.png" alt="GravityWiz">
				</button>
				<button data-site="gravitykit" class="site-button" title="GravityKit">
					<img src="icons/gravitykit.png" alt="GravityKit">
				</button>
			</div>

			<!-- 🔹 Search Input Field -->
			<input type='text' id='gf-search-input' placeholder='Search Docs...'>
			<div id='gf-search-results'></div>
		`;

		document.body.appendChild(searchBox);
		document.getElementById("gf-search-input").focus();
		document.getElementById("gf-search-input").addEventListener("keyup", debounce(fetchSearchResults, 300));
		
		function updateActiveButton(selectedSite) {
			document.querySelectorAll(".site-button").forEach(button => {
				if (button.dataset.site === selectedSite) {
					button.classList.add("active");
				} else {
					button.classList.remove("active");
				}
			});
		}

		// 🔹 Load last selected doc site
		chrome.storage.sync.get(["selectedDocSite"], function (data) {
			selectedDocSite = data.selectedDocSite || "gravityforms";
			updateActiveButton(selectedDocSite);
		});

		// 🔹 Add event listener for site selection
		document.getElementById("search-site-selector").addEventListener("click", (e) => {
			if (e.target.closest(".site-button")) {
				selectedDocSite = e.target.closest(".site-button").dataset.site;
				chrome.storage.sync.set({ selectedDocSite });
		
				// Update UI for active button
				updateActiveButton(selectedDocSite);
		
				// 🔹 Clear the search input field and results when switching sites
				let searchInput = document.getElementById("gf-search-input");
				let resultsDiv = document.getElementById("gf-search-results");
				
				if (searchInput) {
					searchInput.value = ""; // Clear input
					searchInput.placeholder = "Search Docs..."; // Reset placeholder
				}
				
				if (resultsDiv) {
					resultsDiv.innerHTML = ""; // Clear previous results
				}
			}
		});

		// 🔹 **Close search box when Esc is pressed**
		document.getElementById("gf-search-input").addEventListener("keydown", function (event) {
			if (event.key === "Escape") {
				console.log("🔹 Esc pressed: Closing search box");
				searchBox.remove();
			}
		});
		
		// 🔹 **Fix Icon Paths for Extension**
		document.querySelectorAll(".site-button img").forEach(img => {
			const site = img.closest("button").dataset.site;
			img.src = chrome.runtime.getURL(`icons/${site}.png`);
			console.log(`Updated icon for ${site}:`, img.src);
		});
	}
}

// Fetch search results
function fetchSearchResults(event) {
	let query = event.target.value.trim();

	// 🔹 If the input is empty, clear results immediately
	let resultsDiv = document.getElementById("gf-search-results");
	if (!query) {
		resultsDiv.innerHTML = "";
		return;
	}

	console.log("🔎 Fetching search results for:", query);
	console.log("🌍 Selected Doc Site:", selectedDocSite); // Debugging

	let searchEndpoint;

	// Determine which doc site to search
	switch (selectedDocSite) {
		case "gravityflow":
			console.log("🛠 Using Algolia for Gravity Flow search...");
			chrome.runtime.sendMessage(
				{ type: "search", query: query, site: "gravityflow" },
				handleSearchResponse
			);
			return;

		case "gravitysmtp":
			console.log("🛠 Using WP API for Gravity SMTP search...");
			searchEndpoint = `https://docs.gravitysmtp.com/wp-json/wp/v2/search?search=${encodeURIComponent(query)}&per_page=20`;
			break;

		case "gravitywiz":
			console.log("🛠 Using WP API for GravityWiz search...");
			searchEndpoint = `https://gravitywiz.com/wp-json/wp/v2/search?search=${encodeURIComponent(query)}&per_page=20`;
			break;

		case "gravitykit":
			console.log("🛠 Using WP API for GravityKit search...");
			searchEndpoint = `https://gravitykit.com/wp-json/wp/v2/search?search=${encodeURIComponent(query)}&per_page=20`;
			break;

		default: // ✅ Gravity Forms (default)
			console.log("🛠 Using Algolia for Gravity Forms search...");
			chrome.runtime.sendMessage(
				{ type: "search", query: query, site: "gravityforms" },
				handleSearchResponse
			);
			return;
	}

	// Fetch results for WordPress API sites (Gravity SMTP, GravityWiz, GravityKit)
	fetch(searchEndpoint)
		.then(response => response.json())
		.then(handleSearchResponse)
		.catch(error => console.error("❌ Search API error:", error));
}

// Handle search response
function handleSearchResponse(response) {
	let resultsDiv = document.getElementById("gf-search-results");
	resultsDiv.innerHTML = ""; // Clear previous results

	console.log("📡 Raw Search Response:", response);

	// 🔹 Handle different response structures
	let posts = [];
	let categories = [];
	
	if (response.posts && response.categories) {
		// New multi-index response structure
		posts = response.posts || [];
		categories = response.categories || [];
	} else if (Array.isArray(response)) {
		// Legacy array response (Gravity SMTP)
		posts = response;
	} else if (response.hits) {
		// Legacy hits response
		posts = response.hits;
	}

	// 🔹 If no results found, show message
	if ((!posts || posts.length === 0) && (!categories || categories.length === 0)) {
		resultsDiv.innerHTML = "<div style='padding: 8px; color: #888;'>No results found</div>";
		return;
	}

	// 🔹 Display categories first (if any)
	if (categories && categories.length > 0) {
		// Add section header for categories
		let categoryHeader = document.createElement("div");
		categoryHeader.className = "search-section-header";
		categoryHeader.textContent = "📁 DOCUMENTATION CATEGORIES";
		categoryHeader.style.cssText = `
			padding: 8px 5px 4px 5px;
			font-weight: bold;
			font-size: 12px;
			color: #666;
			background-color: #f8f9fa;
			border-bottom: 1px solid #e9ecef;
			text-transform: uppercase;
			letter-spacing: 0.5px;
		`;
		resultsDiv.appendChild(categoryHeader);

		// Process category results
		categories.forEach(category => {
			let div = document.createElement("div");
			div.className = "gf-search-result category-result";
			
			// Create category display with icon and breadcrumb
			let categoryContent = document.createElement("div");
			categoryContent.style.cssText = `
				display: flex;
				align-items: center;
				gap: 8px;
			`;
			
			// Category icon (using a simple tag icon)
			let icon = document.createElement("span");
			icon.textContent = "🏷️";
			icon.style.fontSize = "12px";
			
			// Category title
			let title = document.createElement("span");
			title.textContent = category.name || category.title || category.term_name;
			title.style.fontWeight = "500";
			
			// Breadcrumb path (if available)
			let breadcrumb = document.createElement("div");
			breadcrumb.style.cssText = `
				font-size: 11px;
				color: #888;
				margin-top: 2px;
			`;
			breadcrumb.textContent = category.breadcrumb || "Home > " + (category.taxonomy || "Category");
			
			categoryContent.appendChild(icon);
			categoryContent.appendChild(title);
			div.appendChild(categoryContent);
			div.appendChild(breadcrumb);
			
			div.dataset.url = category.url || category.link || category.permalink || `https://docs.gravityforms.com/category/${category.slug}/`;

			div.style.cssText = `
				padding: 8px 5px;
				cursor: pointer;
				border-bottom: 1px solid #e9ecef;
				background-color: #fafbfc;
			`;

			// Hover effect
			div.addEventListener("mouseenter", function() {
				this.style.backgroundColor = "#f0f1f2";
			});
			div.addEventListener("mouseleave", function() {
				this.style.backgroundColor = "#fafbfc";
			});

			// Clicking copies the result based on user setting
			div.addEventListener("click", function () {
				chrome.storage.sync.get(["copyAsMarkdown"], function (data) {
					let copyAsMarkdown = data.copyAsMarkdown || false;
					let title = category.name || category.title || category.term_name;

					if (copyAsMarkdown) {
						copyHyperlink(title, div.dataset.url);
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
	}

	// 🔹 Display posts (if any)
	if (posts && posts.length > 0) {
		// Add section header for posts (only if we also have categories)
		if (categories && categories.length > 0) {
			let postsHeader = document.createElement("div");
			postsHeader.className = "search-section-header";
			postsHeader.textContent = "📄 DOCUMENTATION PAGES";
			postsHeader.style.cssText = `
				padding: 8px 5px 4px 5px;
				font-weight: bold;
				font-size: 12px;
				color: #666;
				background-color: #f8f9fa;
				border-bottom: 1px solid #e9ecef;
				text-transform: uppercase;
				letter-spacing: 0.5px;
				margin-top: 5px;
			`;
			resultsDiv.appendChild(postsHeader);
		}

		// Process post results
		posts.forEach(hit => {
			let div = document.createElement("div");
			div.className = "gf-search-result post-result";
			div.textContent = hit.title || hit.post_title;
			div.dataset.url = hit.url || hit.link || hit.post_url || hit.permalink;

			div.style.cssText = `
				padding: 5px;
				cursor: pointer;
				border-bottom: 1px solid #ddd;
			`;

			// Clicking copies the result based on user setting
			div.addEventListener("click", function () {
				chrome.storage.sync.get(["copyAsMarkdown"], function (data) {
					let copyAsMarkdown = data.copyAsMarkdown || false; // Default: Copy URL only

					if (copyAsMarkdown) {
						copyHyperlink(div.textContent, div.dataset.url);
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
	}
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
	copiedMessage.className = "copied-message";

	document.body.appendChild(copiedMessage);
	setTimeout(() => copiedMessage.remove(), 1000);
}

// **Inject CSS Styles**
function injectSearchStyles() {
	const style = document.createElement("style");
	style.textContent = `
		#gf-search-box {
			position: fixed;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			padding: 15px;
			background-color: #fff;
			border: 1px solid #ccc;
			box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
			z-index: 10000;
			border-radius: 8px;
			width: 100%;
			max-width: 350px;
			text-align: left;
		}
		#search-site-selector {
			display: flex;
			justify-content: center;
			gap: 6px;
			margin-bottom: 10px;
			flex-wrap: wrap;
		}
		#gf-search-input {
			width: 100%; /* Ensures full width */
			box-sizing: border-box; /* Prevents width issues due to padding */
			padding: 8px;
			font-size: 14px;
			border: 1px solid #ccc;
			border-radius: 4px;
		}
		.site-button {
			background: none;
			border: none;
			cursor: pointer;
		}
		.site-button img {
			width: 24px; /* Default size */
			height: 24px;
			object-fit: contain;
			transition: all 0.2s ease-in-out; /* Smooth size transition */
		}
		.site-button.active img {
			width: 28px; /* Larger size when active */
			height: 28px;
			border-bottom: 3px solid #0073e6; /* Gravity Forms blue */
			border-radius: 0; /* Remove square effect */
		}
		#gf-search-results {
			margin-top: 10px;
			max-height: 200px;
			overflow-y: auto;
		}
		.gf-search-result {
			padding: 5px;
			cursor: pointer;
			border-bottom: 1px solid #ddd;
		}
		.copied-message {
			position: fixed;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			background-color: #000;
			color: #fff;
			padding: 8px 12px;
			border-radius: 5px;
			z-index: 10001;
			font-size: 14px;
		}
	`;
	document.head.appendChild(style);
}

// **Debounce function**
function debounce(func, delay = 150) {
	let timeout;
	return function () {
		clearTimeout(timeout);
		timeout = setTimeout(() => func.apply(this, arguments), delay);
	};
}
