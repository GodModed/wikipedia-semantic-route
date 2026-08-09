# Wikipedia Semantic Path Finder

## Finds the "quickest" route between two wikipedia articles by following the link with the highest cosine similarity between the articles' embeddings.

Dependencies:
* [bun](https://bun.com)
* [ollama](https://ollama.com)

Install
```bash
bun install
ollama pull embeddinggemma:300m
```

Run
- Set currentPage and endPage in index.ts to your start and end wikipedia article titles.
```bash
bun run index.ts
```

Notes
* This is not a perfect solution, as it may not always find the shortest path between two articles. However, it finds a path that is semantically similar, which can be useful for researching at related topics.
* There is no guarantee that a path will be found. It may fall into local maxima, or the endPage may not be reachable from the currentPage.