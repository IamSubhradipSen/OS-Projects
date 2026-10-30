import createPagingEngine from "./wasm/pagingEngine.node.js";

const engine = await createPagingEngine();
const pages = [7,0,1,2,0,3,0,4,2,3,0,3,2,1,2,0,1,7,0,1];

for (const algorithm of [0, 1, 2]) {
  const result = engine.simulateForWeb(algorithm, pages, 3);
  console.log({
    algorithm: ["FIFO", "LRU", "OPT"][algorithm],
    pageFaults: result.pageFaults,
    pageHits: result.pageHits,
    faultRate: result.faultRate,
    calculatedRate: result.pageFaults / pages.length
  });
}

