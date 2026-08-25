import wiki, { summaryError } from "wikipedia";
import ollama from "ollama";
import input from '@inquirer/input';
import { sleep } from "bun";


type Page = {
    name: string,
    summary: string,
    embedding: number[]
};

const pageCache = new Map<string, Page>();

const startingPage = await getUserInputPage("Starting Wikipedia page");
const endPage = await getUserInputPage("Ending Wikipedia page");

let currentPage = startingPage;
let steps = 0;

while (currentPage != endPage) {
    steps++;
    const links = await wiki.links(currentPage);
    let currentPageIdx = 0;
    const pages: string[] = [];
    for (const link of links) {
        currentPageIdx++;
        process.stdout.write(`${currentPage} - ${currentPageIdx}/${links.length} links\r`);

        try {
            await getPage(link);
            pages.push(link);
        } catch (error) {
            if (error instanceof summaryError) {
                continue;
            }
            throw error;
        }
        await sleep(100);
    }

    console.log();

    let bestName: string = "";
    let bestScore = -1;
    for (const page of pages) {
        try {
            const score = cosineSimilarity((await getPage(endPage)).embedding, (await getPage(page)).embedding);

            if (score > bestScore) {
                bestScore = score;
                bestName = page;
            }
        } catch (_) { }
    }

    console.log(bestName, "won the bet with a score of", bestScore);
    currentPage = bestName;
}

console.log(`${startingPage} -> ${endPage} in ${steps} steps`);

async function getPage(name: string): Promise<Page> {

    if (pageCache.has(name)) return pageCache.get(name)!;

    const summary = await wiki.summary(name);
    const embedding = await ollama.embed({
        model: 'embeddinggemma:300m',
        input: summary.extract
    });

    const page = {
        name,
        summary: summary.extract,
        embedding: embedding.embeddings[0]!
    };
    pageCache.set(name, page);
    return page;
}

function cosineSimilarity(a: number[], b: number[]) {
    let dot: number = 0;
    let magA: number = 0;
    let magB: number = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i]! * b[i]!;
        magA += a[i]! * a[i]!;
        magB += b[i]! * b[i]!;
    }

    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

async function getUserInputPage(message: string): Promise<string> {
    const page = await input({ message });
    const searchResults = await wiki.search(page);
    if (!searchResults.results.length) {
        console.log("Could not find page", message);
        process.exit(1);
    }
    const topSearch = searchResults.results[0]!;
    console.log("Selected ", topSearch.title);
    return topSearch.title;
}