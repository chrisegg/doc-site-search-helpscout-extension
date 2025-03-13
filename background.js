chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.type === "search") {
		console.log("🔎 Processing search request for:", message.query);
		console.log("🌐 Searching site:", message.site);

		let searchUrl;
		let algoliaAppId = "IGVGLF016G"; // Algolia App ID for Gravity Forms & Gravity Flow
		let algoliaApiKey;
		let algoliaIndex;
		let searchParams = `?x-algolia-agent=Algolia%20for%20JavaScript%20(4.18.0)%3B%20Browser%20(lite)&x-algolia-application-id=${algoliaAppId}`;

		if (message.site === "gravityforms") {
			// ✅ Gravity Forms - Algolia Search
			console.log("🛠 Using Algolia for Gravity Forms search...");
			algoliaApiKey = "247e2431fa63c62d0e294c242e4412e2";
			algoliaIndex = "wp_posts_post";
		} 
		else if (message.site === "gravityflow") {
			// ✅ Gravity Flow - Algolia Search (CONFIRMING FIX)
			console.log("🛠 Using Algolia for Gravity Flow search...");
			algoliaApiKey = "ab3941e081752932636dd1ab880eb2b4";
			algoliaIndex = "gflow_posts_post";
		} 
		else if (message.site === "gravitysmtp") {
			// ✅ Gravity SMTP - WP API Search
			console.log("🛠 Using WP API for Gravity SMTP search...");
			searchUrl = `https://docs.gravitysmtp.com/wp-json/wp/v2/search?search=${encodeURIComponent(message.query)}&per_page=20`;

			fetch(searchUrl)
				.then(response => response.json())
				.then(data => {
					console.log("✅ WP API Response:", data);
					sendResponse({ hits: data });
				})
				.catch(error => {
					console.error("❌ WP API Search request failed:", error);
					sendResponse({ hits: [] });
				});

			return true; // Keep async response channel open
		} 
		else {
			console.error("❌ Unknown doc site requested:", message.site);
			sendResponse({ hits: [] });
			return true;
		}

		// ✅ Construct Algolia URL for GForms & GFlow
		searchUrl = `https://${algoliaAppId}-dsn.algolia.net/1/indexes/${algoliaIndex}/query${searchParams}&x-algolia-api-key=${algoliaApiKey}`;

		console.log("🔗 Algolia Search URL:", searchUrl);
		console.log("📨 Sending request to Algolia...");

		// ✅ Execute Algolia Search for Gravity Forms & Gravity Flow
		fetch(searchUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				query: message.query,
				hitsPerPage: 20,
				attributesToSnippet: ["content:5"],
				highlightPreTag: "__ais-highlight__",
				highlightPostTag: "__/ais-highlight__"
			})
		})
		.then(response => {
			console.log("📡 Raw Algolia Response:", response);
			return response.json();
		})
		.then(data => {
			console.log("✅ Algolia Response Data:", data);
			if (!data.hits || data.hits.length === 0) {
				console.warn("⚠️ No results found in Algolia.");
			}
			sendResponse({ hits: data.hits });
		})
		.catch(error => {
			console.error("❌ Algolia Search request failed:", error);
			sendResponse({ hits: [] });
		});

		return true; // Keeps the message channel open for async response
	}
});
