ABSTRACT

Virtual memory enables an operating system to manage process address spaces independently of the amount of physical memory currently available. Paging divides virtual memory into pages and physical memory into frames. When a requested page is not resident, a page fault occurs. If all frames are occupied, the system must select a resident page for replacement.

This project presents a Virtual Memory Paging Simulator that demonstrates and compares First-In, First-Out (FIFO), Least Recently Used (LRU), and Optimal (OPT) page replacement. The simulation engine is implemented in C++17 and compiled to WebAssembly for execution through a browser interface built with React and TypeScript. Users provide a page reference string and a frame count. The application displays frame states, page hits, page faults, fault rate and algorithm comparisons.

The native C++ test executable passed, all 10 WebAssembly integration tests passed, and the frontend TypeScript/Vite production build completed successfully. For the documented 20-reference example with three frames, FIFO produced 15 faults, LRU produced 12 faults and OPT produced 9 faults.

Keywords: virtual memory, paging, page replacement, FIFO, LRU, Optimal, C++17, WebAssembly, React, TypeScript.

TABLE OF CONTENTS

1. Introduction

2. Problem Statement and Motivation

3. Aim, Objectives and Scope

4. Background and Concepts

5. Page Replacement Algorithms

6. System Requirements and Technology Stack

7. System Architecture and Design

8. Implementation Methodology

9. Case Study and Simulation Results

10. Testing and Validation

11. Discussion

12. Limitations and Future Enhancements

13. Conclusion

References



1. INTRODUCTION

Memory management is a core responsibility of an operating system. A process uses a virtual address space, while the operating system and memory-management hardware map virtual pages to physical memory frames. Paging divides virtual memory into fixed-size pages and physical memory into frames of the same size.

A page reference string represents the order in which a process requests pages. A request is a page hit when the page is already resident in a frame. Otherwise, a page fault occurs and the page must be loaded. If no free frame remains, a page replacement algorithm chooses a resident page to remove.

This project makes the process observable through an interactive simulator. It records frame contents after each request and allows the same input to be evaluated under three replacement policies.

2. PROBLEM STATEMENT AND MOTIVATION

Page replacement algorithms are commonly taught using manually completed frame tables. This can make it difficult to follow frame changes, identify replacement decisions and compare multiple algorithms consistently. The project addresses this learning problem by accepting a reference string and frame count, running multiple policies and displaying their step-by-step results.

2.1 Motivation

Make page hits, page faults and replacement decisions easier to observe.

Evaluate multiple replacement policies using identical input.

Connect a native C++ algorithm implementation with a browser-based interface.

Validate the implementation using repeatable native and WebAssembly tests.

3. AIM, OBJECTIVES AND SCOPE

3.1 Aim

To design and implement an interactive paging simulator that demonstrates FIFO, LRU and Optimal page replacement and compares their page-fault behaviour for a user-provided reference string and frame count.

3.2 Objectives

Implement FIFO, LRU and Optimal page replacement in C++17.

Accept a page reference string and a positive number of memory frames.

Record the frame state and hit/fault outcome for every page reference.

Calculate page faults, page hits and page-fault rate.

Expose the C++ simulation engine to the browser through WebAssembly.

Provide a React and TypeScript interface for simulation and comparison.

Test normal operation, edge cases and invalid inputs.

3.3 Scope

The project simulates page replacement from a supplied reference string. It does not modify the host operating system's virtual-memory subsystem, inspect real process memory or measure hardware page-fault activity. Results are deterministic for a given input, frame count and algorithm.

4. BACKGROUND AND CONCEPTS

4.1 Virtual Memory

Virtual memory provides each process with a logical address space. Address translation maps virtual addresses to physical memory locations and allows process memory to be managed independently of exact physical placement.

4.2 Paging, Pages and Frames

Paging divides a virtual address space into fixed-size pages and physical memory into corresponding frames. A page can be loaded into an available frame, and mapping information records its location.

4.3 Page Hit and Page Fault

A page hit occurs when the requested page is already present in an allocated frame. A page fault occurs when it is absent. If a free frame exists, the page is loaded there; otherwise, a replacement policy selects a resident page to evict.

4.4 Performance Measures

Page faults: references to pages not currently resident in the frames.

Page hits: references to pages already present in the frames.

Page-fault rate: page faults divided by total references, expressed as a percentage.

Page-fault rate (%) = (Total page faults / Total page references) × 100.

5. PAGE REPLACEMENT ALGORITHMS

5.1 First-In, First-Out (FIFO)

FIFO replaces the page that has been resident for the longest time. A queue can track arrival order. When all frames are occupied and a fault occurs, the oldest page is removed and the requested page is inserted. FIFO is simple but does not consider how recently or frequently a page has been used.

5.2 Least Recently Used (LRU)

LRU replaces the page whose most recent use is farthest in the past. It uses past access history as an estimate of near-future behaviour. This can work well when reference patterns exhibit temporal locality, but recency information requires additional bookkeeping.

5.3 Optimal Page Replacement (OPT)

Optimal replacement removes the resident page whose next use is farthest in the future, or a page that will not be used again. It provides the minimum possible fault count for a known reference string and fixed frame count. It is mainly a theoretical benchmark because a real operating system generally cannot know the exact future reference sequence.

Algorithm

Selection basis

Main characteristic

FIFO

Earliest page arrival

Simple; does not use access recency.

LRU

Least recent past access

Uses historical access behaviour.

OPT

Farthest next future use

Theoretical minimum-fault benchmark.

6. SYSTEM REQUIREMENTS AND TECHNOLOGY STACK

6.1 Software Requirements

Component

Technology

Purpose

Simulation engine

C++17

Implements FIFO, LRU and OPT.

Browser compilation

Emscripten / WebAssembly

Compiles and exposes the C++ engine to the browser.

Frontend

React and TypeScript

Provides the interactive user interface.

Build tool

Vite

Runs the development server and creates the production build.

Testing

Native C++ tests and Node.js test runner

Validates native and WebAssembly behaviour.

6.2 Hardware Requirements

A standard desktop or laptop capable of running a modern browser, Node.js, a C++ toolchain and the Emscripten SDK is sufficient for development and demonstration. A formal minimum hardware benchmark was not conducted.

7. SYSTEM ARCHITECTURE AND DESIGN

The application is divided into a simulation engine, a WebAssembly bridge and a browser frontend. The separation keeps page-replacement logic in C++ while allowing users to interact with it through a web interface.

7.1 Main Components

Input layer: receives the page reference string and frame count.

C++ paging engine: validates inputs and executes the selected algorithm.

WebAssembly bridge: converts JavaScript input into C++ data, calls the simulation function and returns a JavaScript-compatible result.

React and TypeScript frontend: invokes the WebAssembly module and displays the simulation and comparison.

Test layer: checks algorithm results, frame states, empty input and invalid inputs.

7.2 Data Flow

The user enters page references and a frame count. The frontend calls the WebAssembly module with an algorithm identifier and the input values. The bridge validates and converts the data, then calls the C++ simulation function. The engine returns the algorithm name, fault count, hit count, fault rate and per-reference steps. Each step records the requested page, frame contents, hit/fault status and replaced page where applicable. The frontend renders this information.

7.3 Result Structure

Field

Description

algorithm

Name of the selected algorithm.

pageFaults

Total number of page faults.

pageHits

Total number of page hits.

faultRate

Page-fault percentage returned by the current WebAssembly interface.

steps

Ordered list of page requests and frame states.

step.page / frames

Requested page and frame contents after processing.

step.hit / replaced

Hit status and replaced page, or null when no page was replaced.

8. IMPLEMENTATION METHODOLOGY

8.1 C++ Simulation Engine

The core simulation is implemented in C++17. The engine accepts an algorithm selection, a vector of page references and a frame count. It returns a structured result containing summary metrics and per-reference steps. Standard C++ containers are used to maintain frame and algorithm state.

8.2 Input Validation

The engine rejects zero or negative frame counts and negative page numbers. Empty reference strings are supported and produce zero faults, zero hits and a zero fault rate. The browser bridge validates page values and limits the reference string to a maximum of 500 entries.

8.3 WebAssembly Integration

Emscripten compiles the C++ source and bridge into a JavaScript module and a WebAssembly binary. The bridge exposes the simulation function to JavaScript. A frontend loader initializes the module and reuses the initialization promise. Separate browser and Node.js builds are used: the browser build serves the React application, while the Node-compatible build supports automated integration testing.

8.4 Frontend

The React and TypeScript frontend provides controls for entering the page reference string, setting the number of frames and selecting an algorithm. It displays simulation progression, frame states and summary measures, and supports comparison of the algorithms. The frontend invokes the compiled engine rather than maintaining a separate TypeScript implementation of the paging algorithms.

8.5 Development and Build Process

The native engine is compiled and tested independently. The WebAssembly module is compiled using Emscripten. The frontend runs through the Vite development server and can be built for production using its package scripts. The production build completed successfully during project verification.

9. CASE STUDY AND SIMULATION RESULTS

9.1 Case Study Input

The following reference string was used to compare all three algorithms under identical conditions:

7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1

Number of frames: 3. Total page references: 20.

9.2 Recorded Results

Algorithm

Page faults

Page hits

Page-fault rate

FIFO

15

5

75%

LRU

12

8

60%

Optimal

9

11

45%

The counts above were confirmed by the WebAssembly diagnostic run and match the expected test values. Fault rate is calculated as page faults divided by the 20 references and expressed as a percentage.

9.3 Interpretation

For this input, FIFO produces the highest fault count of the three policies. LRU reduces the number of faults from 15 to 12, showing that recent-use information is beneficial for this reference pattern. OPT produces 9 faults, the lowest count, because it uses knowledge of future references when selecting a page to replace.

The result illustrates that the same reference string and frame count can produce different fault totals under different replacement policies. This ranking applies to the stated example and should not be treated as a universal ranking for every possible reference string.

10. TESTING AND VALIDATION

Testing was performed at two levels: native C++ engine tests and WebAssembly integration tests. The frontend production build was also executed to confirm TypeScript compilation and Vite bundling.

10.1 Native C++ Tests

The native test executable reported: “All paging engine tests passed!” Coverage includes the sample reference string, expected fault and hit counts, repeated references, one-frame behaviour, empty input, frame-state checks and invalid input cases.

10.2 WebAssembly Integration Tests

The Node.js integration suite initializes the actual compiled WebAssembly module and verifies algorithm results, frame-state structure, empty input, repeated pages and invalid frame/page inputs.

Integration test

Outcome

Initialize real WebAssembly module

Passed

FIFO expected results

Passed

LRU expected results

Passed

OPT expected results

Passed

Frame-state structure

Passed

Empty reference string

Passed

Repeated pages

Passed

Reject zero frames

Passed

Reject negative page numbers

Passed

Reject negative frame counts

Passed

Total

10 passed, 0 failed

10.3 Frontend Production Build

The command `npm.cmd run build` completed successfully. TypeScript project compilation and the Vite production build both finished. Vite displayed a non-fatal warning that the generated JavaScript chunk exceeded 500 kB after minification. The warning did not prevent the build from completing.

10.4 Verification Summary

Verification activity

Observed result

Native C++ test executable

Passed

WebAssembly integration suite

10 passed, 0 failed

Frontend production build

Successful

Browser WebAssembly asset

Previously observed loading successfully (HTTP 200)

11. DISCUSSION

The implementation separates algorithm logic from user-interface responsibilities. C++ provides the simulation, while WebAssembly makes that implementation available to the browser. This avoids maintaining separate algorithm implementations in the frontend.

Per-step frame-state output supports learning because it makes replacement decisions visible rather than reporting only a final number. Comparing algorithms on the same reference string and frame count provides a consistent basis for evaluating their results.

The tests provide evidence that the native engine and its WebAssembly interface return the expected values for the documented sample and selected edge cases. They do not prove correctness for every possible input or measure performance against a production operating system.

12. LIMITATIONS AND FUTURE ENHANCEMENTS

12.1 Current Limitations

The simulator models page replacement from a supplied reference string; it does not interact with real process memory or host operating-system page tables.

Optimal replacement requires future-reference knowledge and is therefore a benchmark rather than a directly implementable general-purpose policy.

The current bridge limits the input reference string to 500 page entries.

The production build reports a JavaScript bundle-size warning, although the build succeeds.

The recorded tests cover defined sample and edge cases, not every possible input sequence.

12.2 Future Enhancements

Add step-by-step playback controls, pause, resume and reset functionality.

Allow random reference-string generation and repeated experiments.

Add additional policies such as Second Chance or Clock.

Provide exportable simulation reports and frame-state tables.

Improve frontend code splitting to reduce the initial JavaScript bundle size.

Expand automated tests with randomized inputs and systematic native-versus-WASM parity checks.

13. CONCLUSION

The Virtual Memory Paging Simulator was designed and implemented to demonstrate FIFO, LRU and Optimal page replacement. It combines a C++17 simulation engine with an Emscripten-generated WebAssembly interface and a React/TypeScript frontend. Users can provide a page reference string and frame count, inspect frame states and compare page faults, hits and fault rates.

For the documented 20-reference case with three frames, FIFO produced 15 faults, LRU produced 12 faults and OPT produced 9 faults. The native C++ test executable passed, all 10 WebAssembly integration tests passed, and the frontend production build completed successfully. The project therefore meets its core educational objective of providing an interactive demonstration of page replacement behaviour.

REFERENCES

Silberschatz, A., Galvin, P. B., and Gagne, G., Operating System Concepts. Wiley. Consult the edition used in the course.

Tanenbaum, A. S., and Bos, H., Modern Operating Systems. Pearson. Consult the edition used in the course.

Emscripten Documentation, https://emscripten.org/docs/

WebAssembly Documentation, https://webassembly.org/

React Documentation, https://react.dev/

TypeScript Documentation, https://www.typescriptlang.org/docs/

Vite Documentation, https://vite.dev/guide/
