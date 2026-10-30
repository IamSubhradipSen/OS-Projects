
#include "paging.hpp"

#include <algorithm>
#include <limits>
#include <queue>
#include <stdexcept>
#include <string>

namespace {

// Checks whether a page is currently in memory.
bool containsPage(const std::vector<int>& frames, int page) {
    return std::find(frames.begin(), frames.end(), page)
           != frames.end();
}

// Returns the index of an empty frame, or -1 if none exists.
int findEmptyFrame(const std::vector<int>& frames) {
    for (int i = 0; i < static_cast<int>(frames.size()); ++i) {
        if (frames[i] == -1) {
            return i;
        }
    }
    return -1;
}

// Validates the shared simulation inputs.
void validateInput(const std::vector<int>& pages, int frameCount) {
    if (frameCount <= 0) {
        throw std::invalid_argument(
            "Frame count must be greater than zero."
        );
    }

    for (int page : pages) {
        if (page < 0) {
            throw std::invalid_argument(
                "Page numbers must be non-negative."
            );
        }
    }
}

// Creates an initialized result for an algorithm.
/*SimulationResult createResult(
    Algorithm algorithm,
    int frameCount
    ) {
    SimulationResult result;
    result.algorithm = algorithm;
    result.steps.reserve(frameCount);
    return result;
}*/

// Records the state after one page request.
void recordStep(
    SimulationResult& result,
    int page,
    const std::vector<int>& frames,
    bool hit,
    std::optional<int> replacedPage
) {
    PageStep step;
    step.requestedPage = page;
    step.frames = frames;
    step.hit = hit;
    step.replacedPage = replacedPage;

    result.steps.push_back(step);

    if (hit) {
        ++result.pageHits;
    } else {
        ++result.pageFaults;
    }
}

// FIFO: evict the page that entered memory earliest.
SimulationResult runFIFO(
    const std::vector<int>& pages,
    int frameCount
) {
    SimulationResult result;
    result.algorithm = Algorithm::FIFO;

    std::vector<int> frames(frameCount, -1);
    std::queue<int> insertionOrder;

    for (int page : pages) {
        bool hit = containsPage(frames, page);
        std::optional<int> replaced;

        if (!hit) {
            int emptyIndex = findEmptyFrame(frames);

            if (emptyIndex != -1) {
                frames[emptyIndex] = page;
            } else {
                // The queue front is the oldest resident page.
                int victim = insertionOrder.front();
                insertionOrder.pop();

                replaced = victim;

                auto it = std::find(
                    frames.begin(), frames.end(), victim
                );
                *it = page;
            }

            insertionOrder.push(page);
        }

        recordStep(result, page, frames, hit, replaced);
    }

    return result;
}

// LRU: evict the page used least recently.
SimulationResult runLRU(
    const std::vector<int>& pages,
    int frameCount
) {
    SimulationResult result;
    result.algorithm = Algorithm::LRU;

    std::vector<int> frames(frameCount, -1);
    std::vector<int> lastUsed(frameCount, -1);

    for (int time = 0; time < static_cast<int>(pages.size()); ++time) {
        int page = pages[time];
        bool hit = containsPage(frames, page);
        std::optional<int> replaced;

        if (hit) {
            int index = static_cast<int>(
                std::find(frames.begin(), frames.end(), page)
                - frames.begin()
            );

            lastUsed[index] = time;
        } else {
            int index = findEmptyFrame(frames);

            if (index == -1) {
                // The smallest timestamp identifies the LRU page.
                index = static_cast<int>(
                    std::min_element(
                        lastUsed.begin(), lastUsed.end()
                    ) - lastUsed.begin()
                );

                replaced = frames[index];
            }

            frames[index] = page;
            lastUsed[index] = time;
        }

        recordStep(result, page, frames, hit, replaced);
    }

    return result;
}

// OPT: evict the page whose next use is farthest in the future.
SimulationResult runOPT(
    const std::vector<int>& pages,
    int frameCount
) {
    SimulationResult result;
    result.algorithm = Algorithm::OPT;

    std::vector<int> frames(frameCount, -1);

    for (int time = 0; time < static_cast<int>(pages.size()); ++time) {
        int page = pages[time];
        bool hit = containsPage(frames, page);
        std::optional<int> replaced;

        if (!hit) {
            int index = findEmptyFrame(frames);

            if (index == -1) {
                int victimIndex = -1;
                int farthestUse = -1;

                for (int i = 0; i < frameCount; ++i) {
                    int nextUse = std::numeric_limits<int>::max();

                    // Find the next occurrence of this resident page.
                    for (int j = time + 1;
                         j < static_cast<int>(pages.size()); ++j) {
                        if (pages[j] == frames[i]) {
                            nextUse = j;
                            break;
                        }
                    }

                    // A page never used again is the best victim.
                    if (nextUse == std::numeric_limits<int>::max()) {
                        victimIndex = i;
                        break;
                    }

                    if (nextUse > farthestUse) {
                        farthestUse = nextUse;
                        victimIndex = i;
                    }
                }

                index = victimIndex;
                replaced = frames[index];
            }

            frames[index] = page;
        }

        recordStep(result, page, frames, hit, replaced);
    }

    return result;
}

} // namespace

std::string algorithmName(Algorithm algorithm) {
    switch (algorithm) {
        case Algorithm::FIFO:
            return "FIFO";
        case Algorithm::LRU:
            return "LRU";
        case Algorithm::OPT:
            return "Optimal";
    }

    return "Unknown";
}

SimulationResult simulate(
    Algorithm algorithm,
    const std::vector<int>& referenceString,
    int frameCount
) {
    validateInput(referenceString, frameCount);

    SimulationResult result;

    switch (algorithm) {
        case Algorithm::FIFO:
            result = runFIFO(referenceString, frameCount);
            break;

        case Algorithm::LRU:
            result = runLRU(referenceString, frameCount);
            break;

        case Algorithm::OPT:
            result = runOPT(referenceString, frameCount);
            break;

        default:
            throw std::invalid_argument("Unsupported algorithm.");
    }

    if (!referenceString.empty()) {
        result.faultRate =
            100.0 * result.pageFaults / referenceString.size();
    }

    return result;
}
