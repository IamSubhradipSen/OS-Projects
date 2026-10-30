
# Virtual Memory Visualizer

An educational operating systems project that simulates
FIFO, LRU, and Optimal page replacement algorithms.

## Features

- Configurable physical memory frame count
- Custom page reference strings
- Frame-by-frame execution trace
- Page hit and page fault tracking
- Total page fault and fault rate calculations
- Algorithm comparison summary
- Automated C++ tests

## Technologies

- C++17
- Standard Template Library (STL)

## Build

Run these commands from the project root:

```powershell
g++ -std=c++17 -Wall -Wextra -pedantic -I engine/include engine/src/paging.cpp engine/src/main.cpp -o paging_visualizer.exe
```

## Run

```powershell
.\paging_visualizer.exe
```

## Test

```powershell
g++ -std=c++17 -Wall -Wextra -pedantic -I engine/include engine/src/paging.cpp engine/tests/test_paging.cpp -o paging_tests.exe
.\paging_tests.exe
```

## Algorithms

- FIFO: replaces the page loaded earliest.
- LRU: replaces the least recently used page.
- Optimal: replaces the page whose next use is farthest
  in the future, minimizing page faults for the given input.

## Project status

Phase 1: C++ simulation engine and automated tests.
