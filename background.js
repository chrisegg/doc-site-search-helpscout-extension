chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "search") {
	console.log("🔎 Processing search request for:", message.query);

	fetch("https://igvglf016g-dsn.algolia.net/1/indexes/wp_posts_post/query", {
	  method: "POST",
	  headers: {
		"Content-Type": "application/json",
		"X-Algolia-Application-Id": "IGVGLF016G",
		"X-Algolia-API-Key": "247e2431fa63c62d0e294c242e4412e2"
	  },
	  body: JSON.stringify({
		query: message.query,
		hitsPerPage: 20,
		attributesToSnippet: ["content:5"],
		highlightPreTag: "__ais-highlight__",
		highlightPostTag: "__/ais-highlight__"
	  })
	})
	.then(response => response.json())
	.then(data => {
	  console.log("✅ Algolia Response:", data);
	  sendResponse({ hits: data.hits });
	})
	.catch(error => {
	  console.error("❌ Search request failed:", error);
	  sendResponse({ hits: [] });
	});

	return true; // Keeps the message channel open for async response
  }
});