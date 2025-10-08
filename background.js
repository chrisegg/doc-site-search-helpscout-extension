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
			// ✅ Gravity Forms - Algolia Search (Multiple Indexes)
			console.log("🛠 Using Algolia for Gravity Forms search...");
			algoliaApiKey = "247e2431fa63c62d0e294c242e4412e2";
			
			// Search both posts and categories indexes
			searchMultipleIndexes(algoliaAppId, algoliaApiKey, message.query, [
				"wp_posts_post",      // Posts/pages
				"wp_terms_category"   // Categories
			], sendResponse);
			return true;
		} 
		else if (message.site === "gravityflow") {
			// ✅ Gravity Flow - Algolia Search (Multiple Indexes)
			console.log("🛠 Using Algolia for Gravity Flow search...");
			algoliaApiKey = "ab3941e081752932636dd1ab880eb2b4";
			
			// Search both posts and categories indexes
			searchMultipleIndexes(algoliaAppId, algoliaApiKey, message.query, [
				"gflow_posts_post",   // Posts/pages
				"gflow_terms_category" // Categories
			], sendResponse);
			return true;
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
		else if (message.site === "gravitywiz") {
			// ✅ GravityWiz - WP API Search
			console.log("🛠 Using WP API for GravityWiz search...");
			searchUrl = `https://gravitywiz.com/wp-json/wp/v2/search?search=${encodeURIComponent(message.query)}&per_page=20`;

			fetch(searchUrl)
				.then(response => response.json())
				.then(data => {
					console.log("✅ GravityWiz WP API Response:", data);
					sendResponse({ hits: data });
				})
				.catch(error => {
					console.error("❌ GravityWiz WP API Search request failed:", error);
					sendResponse({ hits: [] });
				});

			return true; // Keep async response channel open
		}
		else if (message.site === "gravitykit") {
			// ✅ GravityKit - WP API Search
			console.log("🛠 Using WP API for GravityKit search...");
			searchUrl = `https://gravitykit.com/wp-json/wp/v2/search?search=${encodeURIComponent(message.query)}&per_page=20`;

			fetch(searchUrl)
				.then(response => response.json())
				.then(data => {
					console.log("✅ GravityKit WP API Response:", data);
					sendResponse({ hits: data });
				})
				.catch(error => {
					console.error("❌ GravityKit WP API Search request failed:", error);
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

// ✅ Function to search multiple Algolia indexes
function searchMultipleIndexes(algoliaAppId, algoliaApiKey, query, indexes, sendResponse) {
	console.log("🔍 Searching multiple indexes:", indexes);
	
	const searchParams = `?x-algolia-agent=Algolia%20for%20JavaScript%20(4.18.0)%3B%20Browser%20(lite)&x-algolia-application-id=${algoliaAppId}&x-algolia-api-key=${algoliaApiKey}`;
	
	// Create search requests for all indexes
	const searchPromises = indexes.map(indexName => {
		const searchUrl = `https://${algoliaAppId}-dsn.algolia.net/1/indexes/${indexName}/query${searchParams}`;
		
		console.log(`🔗 Searching index: ${indexName}`);
		
		return fetch(searchUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				query: query,
				hitsPerPage: 10, // Limit per index to keep total results manageable
				attributesToSnippet: ["content:5"],
				highlightPreTag: "__ais-highlight__",
				highlightPostTag: "__/ais-highlight__"
			})
		})
		.then(response => response.json())
		.then(data => {
			console.log(`✅ ${indexName} results:`, data.hits?.length || 0);
			return {
				index: indexName,
				hits: data.hits || [],
				type: indexName.includes('category') ? 'category' : 'post'
			};
		})
		.catch(error => {
			console.error(`❌ Error searching ${indexName}:`, error);
			return {
				index: indexName,
				hits: [],
				type: indexName.includes('category') ? 'category' : 'post'
			};
		});
	});
	
	// Wait for all searches to complete
	Promise.all(searchPromises)
		.then(results => {
			console.log("📊 All search results:", results);
			
			// Combine and organize results
			const combinedResults = {
				posts: [],
				categories: []
			};
			
			results.forEach(result => {
				if (result.type === 'category') {
					combinedResults.categories = combinedResults.categories.concat(result.hits);
				} else {
					combinedResults.posts = combinedResults.posts.concat(result.hits);
				}
			});
			
			// Send combined results
			sendResponse(combinedResults);
		})
		.catch(error => {
			console.error("❌ Error in multi-index search:", error);
			sendResponse({ posts: [], categories: [] });
		});
}
