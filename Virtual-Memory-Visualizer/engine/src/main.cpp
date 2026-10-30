
#include "paging.hpp"
#include <limits>
#include <iomanip>
#include <iostream>
#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>

namespace {

// Sample sequence for demonstrations and testing.
const std::vector<int> SAMPLE_PAGES = {
    7, 0, 1, 2, 0, 3, 0, 4, 2, 3,
    0, 3, 2, 1, 2, 0, 1, 7, 0, 1
};

// Parses space-separated, non-negative page numbers.
std::vector<int> parseReferenceString(const std::string& input) {
    std::istringstream stream(input);
    std::vector<int> pages;
    std::string token;

    while (stream >> token) {
        std::size_t parsedChars = 0;
        int page;

        try {
            page = std::stoi(token, &parsedChars);
        } catch (const std::exception&) {
            throw std::invalid_argument(
                "Enter only non-negative integer page numbers."
            );
        }

        if (parsedChars != token.size() || page < 0) {
            throw std::invalid_argument(
                "Enter only non-negative integer page numbers."
            );
        }

        pages.push_back(page);
    }

    return pages;
}

// Prints the full trace of one algorithm.
void printSimulation(const SimulationResult& result, int frameCount) {
    std::cout << "\n========== "
              << algorithmName(result.algorithm)
              << " ==========\n";

    std::cout << std::left << std::setw(8) << "Page";

    for (int i = 0; i < frameCount; ++i) {
        std::cout << std::right << std::setw(6)
                  << ("F" + std::to_string(i + 1));
    }

    std::cout << std::right << std::setw(10) << "Result"
              << std::setw(12) << "Replaced" << '\n';

    std::cout << std::string(18 + frameCount * 6, '-') << '\n';

    for (const PageStep& step : result.steps) {
        std::cout << std::left << std::setw(8)
                  << step.requestedPage;

        for (int page : step.frames) {
            std::string cell = (page == -1)
                ? "-"
                : std::to_string(page);

            std::cout << std::right << std::setw(6) << cell;
        }

        std::cout << std::right << std::setw(10)
                  << (step.hit ? "Hit" : "Fault");

        std::string replaced = step.replacedPage
            ? std::to_string(*step.replacedPage)
            : "-";

        std::cout << std::setw(12) << replaced << '\n';
    }

    std::cout << "\nPage requests : " << result.steps.size()
              << "\nPage hits     : " << result.pageHits
              << "\nPage faults   : " << result.pageFaults
              << "\nFault rate    : " << std::fixed
              << std::setprecision(2) << result.faultRate << "%\n";
}

// Prints a compact comparison of all three algorithms.
void printComparison(const std::vector<SimulationResult>& results) {
    std::cout << "\n========== ALGORITHM COMPARISON ==========\n";

    std::cout << std::left
              << std::setw(12) << "Algorithm"
              << std::right
              << std::setw(12) << "Faults"
              << std::setw(12) << "Hits"
              << std::setw(14) << "Fault Rate" << '\n';

    for (const SimulationResult& result : results) {
        std::cout << std::left << std::setw(12)
                  << algorithmName(result.algorithm)
                  << std::right << std::setw(12)
                  << result.pageFaults
                  << std::setw(12) << result.pageHits
                  << std::setw(13) << std::fixed
                  << std::setprecision(2) << result.faultRate
                  << "%\n";
    }
}

} // namespace

int main() {
    try {
        int frameCount;

        std::cout << "VIRTUAL MEMORY VISUALIZER - PHASE 1\n";
        std::cout << "Enter number of physical frames: ";

        if (!(std::cin >> frameCount) || frameCount <= 0) {
            std::cerr << "Error: Enter a positive frame count.\n";
            return 1;
        }

        // Read the rest of the line after the frame count.
        std::cin.ignore(
            std::numeric_limits<std::streamsize>::max(), '\n'
        );

        std::cout
            << "Enter page reference string (space-separated).\n"
            << "Press Enter to use the sample sequence:\n> ";

        std::string input;
        std::getline(std::cin, input);

        std::vector<int> pages = input.empty()
            ? SAMPLE_PAGES
            : parseReferenceString(input);

        if (pages.empty()) {
            std::cerr << "Error: Reference string cannot be empty.\n";
            return 1;
        }

        std::cout << "\nReference string: ";
        for (int page : pages) {
            std::cout << page << ' ';
        }
        std::cout << '\n';

        // Run all algorithms on exactly the same input.
        std::vector<SimulationResult> results;

        results.push_back(simulate(Algorithm::FIFO, pages, frameCount));
        results.push_back(simulate(Algorithm::LRU, pages, frameCount));
        results.push_back(simulate(Algorithm::OPT, pages, frameCount));

        for (const SimulationResult& result : results) {
            printSimulation(result, frameCount);
        }

        printComparison(results);
    } catch (const std::exception& error) {
        std::cerr << "\nError: " << error.what() << '\n';
        return 1;
    }

    return 0;
}
