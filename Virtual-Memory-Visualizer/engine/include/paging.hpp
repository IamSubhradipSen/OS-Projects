
#ifndef PAGING_HPP
#define PAGING_HPP

#include <optional>
#include <string>
#include <vector>

// All supported page replacement algorithms.
enum class Algorithm {
    FIFO,
    LRU,
    OPT
};

// Result of processing one page request.
struct PageStep {
    int requestedPage{};
    std::vector<int> frames;
    bool hit{false};

    // Page removed from memory, if a replacement occurred.
    std::optional<int> replacedPage;
};

// Complete result of one simulation.
struct SimulationResult {
    Algorithm algorithm{};
    std::vector<PageStep> steps;
    int pageFaults{0};
    int pageHits{0};
    double faultRate{0.0};
};

// Returns a readable algorithm name.
std::string algorithmName(Algorithm algorithm);

// Runs the selected page replacement algorithm.
//
// Requirements:
// - frameCount must be positive.
// - Page numbers must be non-negative.
// - An empty reference string is allowed.
SimulationResult simulate(
    Algorithm algorithm,
    const std::vector<int>& referenceString,
    int frameCount
);

#endif
