import wiki, { summaryError } from "wikipedia";
import ollama from "ollama";
import { embeddedFiles, sleep } from "bun";


type Page = {
    name: string,
    summary: string,
    embedding: number[]
};

const pageCache = new Map<string, Page>();

let currentPage = 'Winter Olympic Games';
const endPage = 'Humanism';

while (currentPage != endPage) {
    const links = await wiki.links(currentPage);
    console.log(currentPage, " - ", links.length, "links");
    const pages: string[] = [];
    for (const link of links) {
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
