

#include "paging.hpp"

#include <cassert>
#include <cmath>
#include <iostream>
#include <stdexcept>
#include <vector>

int main() {
    const std::vector<int> sample = {
        7, 0, 1, 2, 0, 3, 0, 4, 2, 3,
        0, 3, 2, 1, 2, 0, 1, 7, 0, 1
    };

    // Test 1: Known results for the standard sample with three frames.
    const auto fifo = simulate(Algorithm::FIFO, sample, 3);
    const auto lru  = simulate(Algorithm::LRU, sample, 3);
    const auto opt  = simulate(Algorithm::OPT, sample, 3);

    assert(fifo.pageFaults == 15);
    assert(lru.pageFaults == 12);
    assert(opt.pageFaults == 9);

    assert(fifo.pageHits == 5);
    assert(lru.pageHits == 8);
    assert(opt.pageHits == 11);

    assert(std::abs(fifo.faultRate - 75.0) < 0.001);
    assert(std::abs(lru.faultRate - 60.0) < 0.001);
    assert(std::abs(opt.faultRate - 45.0) < 0.001);

    // Test 2: Every page request must produce one recorded step.
    assert(fifo.steps.size() == sample.size());
    assert(lru.steps.size() == sample.size());
    assert(opt.steps.size() == sample.size());

    // Test 3: Repeated page references should produce a hit.
    const auto repeated = simulate(
        Algorithm::FIFO, {1, 2, 1}, 2
    );

    assert(repeated.pageFaults == 2);
    assert(repeated.pageHits == 1);
    assert(repeated.steps.size() == 3);
    assert(repeated.steps[2].hit);

    // Test 4: One frame with FIFO.
    // 5(F), 5(H), 8(F), 8(H), 5(F).
    const auto oneFrameFIFO = simulate(
        Algorithm::FIFO, {5, 5, 8, 8, 5}, 1
    );

    assert(oneFrameFIFO.pageFaults == 3);
    assert(oneFrameFIFO.pageHits == 2);
    assert(oneFrameFIFO.steps.size() == 5);
    assert(oneFrameFIFO.steps[0].frames[0] == 5);
    assert(oneFrameFIFO.steps[2].frames[0] == 8);
    assert(oneFrameFIFO.steps[4].frames[0] == 5);

    // Test 5: One frame with LRU.
    const auto oneFrameLRU = simulate(
        Algorithm::LRU, {5, 5, 8, 8, 5}, 1
    );

    assert(oneFrameLRU.pageFaults == 3);
    assert(oneFrameLRU.pageHits == 2);

    // Test 6: One frame with OPT.
    const auto oneFrameOPT = simulate(
        Algorithm::OPT, {5, 5, 8, 8, 5}, 1
    );

    assert(oneFrameOPT.pageFaults == 3);
    assert(oneFrameOPT.pageHits == 2);

    // Test 7: All algorithms should handle an empty reference string.
    for (Algorithm algorithm : {
             Algorithm::FIFO, Algorithm::LRU, Algorithm::OPT
         }) {
        const auto empty = simulate(algorithm, {}, 3);

        assert(empty.pageFaults == 0);
        assert(empty.pageHits == 0);
        assert(empty.faultRate == 0.0);
        assert(empty.steps.empty());
    }

    // Test 8: A single unique page should fault once and then hit.
    for (Algorithm algorithm : {
             Algorithm::FIFO, Algorithm::LRU, Algorithm::OPT
         }) {
        const auto singlePage = simulate(
            algorithm, {4, 4, 4, 4}, 2
        );

        assert(singlePage.pageFaults == 1);
        assert(singlePage.pageHits == 3);
        assert(std::abs(singlePage.faultRate - 25.0) < 0.001);
    }

    // Test 9: Every recorded frame state must have the correct size.
    for (const auto* result : {&fifo, &lru, &opt}) {
        for (const auto& step : result->steps) {
            assert(step.frames.size() == 3);
        }
    }

    // Test 10: Zero frames must be rejected.
    bool rejected = false;

    try {
        simulate(Algorithm::LRU, sample, 0);
    } catch (const std::invalid_argument&) {
        rejected = true;
    }

    assert(rejected);

    // Test 11: Negative page numbers must be rejected.
    rejected = false;

    try {
        simulate(Algorithm::FIFO, {1, -2, 3}, 2);
    } catch (const std::invalid_argument&) {
        rejected = true;
    }

    assert(rejected);

    // Test 12: Negative frame counts must be rejected.
    rejected = false;

    try {
        simulate(Algorithm::OPT, sample, -1);
    } catch (const std::invalid_argument&) {
        rejected = true;
    }

    assert(rejected);

    std::cout << "All paging engine tests passed!\n";
    return 0;
}
