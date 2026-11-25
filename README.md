# C/C++ Playground

Write **C, C++, Java or Python** in the browser and see the output beside the editor. There is no compile button: a moment after you stop typing, the program is compiled and run again, and the output updates. A light, dark or system theme can be chosen in the toolbar.

**Live site:** https://mazhar1807102.github.io/c-cpp-playground/

## How it works

Everything runs in the browser; nothing is sent to a server. Each language's tools are loaded the first time that language is used, from jsDelivr, and cached after that.

- **C and C++:** Clang/LLVM 22 compiled to WebAssembly ([YoWASP](https://yowasp.org/) build), about 100 MB. `compiler.js` keeps Clang loaded in one worker; `runner.js` runs each program (WebAssembly/WASI, with [browser_wasi_shim](https://github.com/bjorn3/browser_wasi_shim)) in a fresh worker, so a run longer than 5 seconds can be stopped.
- **Python:** CPython 3.14 compiled to WebAssembly ([Pyodide](https://pyodide.org/)), about 14 MB, with the standard library. `python-runner.js` keeps the interpreter in a worker and runs each program in a fresh namespace; a run longer than 5 seconds is stopped and the interpreter reloaded.
- **Java:** OpenJDK's `javac` plus the [TeaVM](https://teavm.org/) compiler, both running in the browser ([LiveCodes java-wasm](https://github.com/live-codes/java)), about 8 MB. Java source is compiled to class files and then to WebAssembly, and runs on TeaVM's implementation of the standard library.

## Supported

- C (C89 to C23) and C++ (C++11 to C++23), `-O0` to `-O2`, warnings with `-Wall -Wextra`.
- `#include <bits/stdc++.h>` in C++. libc++ has no such header, so `compiler.js` supplies one that includes every standard header that compiles here (all but `<csetjmp>` and `<csignal>`), guarded by `__cplusplus` for each standard, plus GCC's `__gcd` and `__lg`.
- Python 3.14 with its standard library (math, random, collections, itertools, heapq, bisect, functools, re, json, datetime, statistics…). `input()`, `sys.exit`, tracebacks with line numbers.
- Java at language level 25 (records, `var`, switch expressions, text blocks) with the common library classes: `Scanner`, `BufferedReader`, `String`, `StringBuilder`, `Math`, arrays, `ArrayList`, `HashMap`/`TreeMap`, `HashSet`/`TreeSet`, `ArrayDeque`, `PriorityQueue`, `Collections`, streams. Any class may hold `main`; `System.exit(n)` works.
- Standard input from the Input box (read all at once; end-of-file after that).
- Compile errors and warnings are listed with clickable line numbers and highlighted in the editor.
- **Suggestions** (on by default, untick to turn off): while you type, a list offers keywords, library names (with the header, package or module they come from), names from your own code, `#include` headers, Java packages and Python modules (<kbd>Ctrl</kbd>+<kbd>Space</kbd> opens it any time). Errors get a plain-English hint under the line, and a button that applies the fix when there is an obvious one — for example a missing `;` or `:`, a missing `#include`, `import java.util.Scanner;` or `from math import sqrt`, `std::`, `throws Exception`, or a misspelled name such as `retrun` → `return` or `Sytem` → `System`.

## Examples

The **Example** menu has 58 programs in each language, in groups: *Getting started*; *Classic programs* (Fibonacci, palindrome number and string, prime check, sieve of Eratosthenes, reverse a number, count and sum digits, Armstrong and perfect numbers, factorial, GCD and LCM, leap year, swap); *Number conversions* (decimal to binary/octal/hex with the division steps, binary to decimal, any base to any base); *Patterns* (triangles, pyramid, diamond, Floyd's and Pascal's triangles, hollow square); *Arrays* (max/min/sum/average, reverse, second largest, linear search, insert and delete, rotate, remove duplicates, frequencies, matrix add/multiply/transpose); *Algorithms, step by step*, which print every step so the output shows how the algorithm works (bubble, selection, insertion, merge, quick and counting sort, binary search, Tower of Hanoi, Kadane's maximum subarray, BFS and DFS); and *Graphs, strings, DP and games* (Dijkstra, Kruskal, KMP, prefix sums, 0/1 knapsack, N-Queens, travelling salesman, minimax with alpha-beta). The C, C++, Java and Python versions read the same input and print exactly the same output. They are in `examples-c.js`, `examples-cpp.js`, `examples-java.js`, `examples-python.js` and `examples-algo.js`.

## Algorithm animations

**Algorithms** at the top of the page (`algorithms.html`) shows the animated, step-by-step simulations from [Algorithm Simulations](https://github.com/MAZHAR1807102/algorithm-simulations): insertion, bubble, counting, merge and quick sort; graph search (BFS, DFS, UCS, A*…); shortest paths; minimum spanning trees; string matching; prefix sums; dynamic programming; N-Queens; the travelling salesman problem; and game theory. Each one has buttons that open the matching program in C, C++, Java or Python in the editor.

In the editor, an example that has an animation shows an **▶ Animation** button: the animation opens in a panel on the right while the code and output stay visible on the left.

The simulations are copied into `sims/` by `node tools/sync-sims.mjs` (run it again after changing the algorithm-simulations repository, then commit `sims/`).

## Practice (Codeforces and CodeChef)

**Practice** (`practice.html`) lists every Codeforces problem (about 11,500) and the rated CodeChef problems (about 6,500), with filters for the judge, topics (dp, greedy, graphs, math…), a difficulty range, a name or ID search, and sorting (most solved, easiest, hardest, newest, shuffle). For each problem:

- **Problem ↗** opens the statement on the judge's site.
- **Solve in editor** opens the code editor with a starting program in C, C++, Java or Python. The problem stays pinned above the editor (with its link, hints and Submit), and the work on each problem is kept.
- **Submit ↗** copies the code and opens the judge's submit page in the browser; paste it there and choose the language. Log in to the judge once in that browser ("Remember me") and Submit goes straight to the form after that.
- **Hints** are given one at a time: how to read the limits, then for each of the problem's topics the idea, when it fits, the steps and common mistakes, with links to the matching animation or STL page, and finally a search for the official editorial. They are built from the problem's topics and difficulty, not written for each problem.
- **Mark solved** and **Hide solved** keep track of progress in the browser.

The lists are saved in `practice-data.js` by `node tools/fetch-problems.mjs` (Codeforces' public API and CodeChef's problem list); run it again to bring in new problems. In the desktop app the list works offline, and Problem and Submit open the browser.

## Tabs and the Window menu

The tab bar at the top switches between the pages. Its **Window** button (and the **Window** menu in the desktop app) chooses which tabs are shown; the code editor is always shown. The choice is remembered.

## C++ STL guide

**C++ STL** at the top of the page (`stl.html`) explains the Standard Template Library topic by topic: `vector`, `string`, `array`, `deque`, `list`, `stack`, `queue`, `priority_queue`, `set`/`multiset`, `map`/`multimap`, the unordered containers, `pair`/`tuple`, `bitset`, iterators, lambdas and comparators, and the algorithms (sorting, searching, min/max, changing ranges, numeric, permutations and set operations, `all_of`/`any_of`). Each topic has a table of the main operations with their time cost and examples that can be edited and run right there (<kbd>Ctrl</kbd>+<kbd>Enter</kbd>), with their own input box; **Open in editor** copies an example into the code editor. The content is in `stl-data.js`.

## Header and library guide

Below the editor, a searchable guide lists the common headers and libraries — 10 for C, 19 for C++, 12 for Java, 12 for Python: what each is for, its main functions with their syntax and meaning, and a runnable example that **Load into editor** opens in the editor. It follows the language switch. The data is in `guide.js` (C, C++) and `guide-more.js` (Java, Python).

## Notebook (Python for data science and machine learning)

**Notebook** at the top of the page (`notebook.html`) is a Jupyter-style notebook for Python: code cells and Markdown text cells, variables shared between cells, tables and plots shown under each cell.

- **Libraries:** numpy, pandas, scipy, scikit-learn, matplotlib and seaborn load automatically the first time a cell imports them. Others can be added with **Packages** or a `%pip install name` line: most of the [Pyodide package collection](https://pyodide.org/en/stable/usage/packages-in-pyodide.html) (statsmodels, sympy, networkx…) and pure-Python packages from PyPI.
- **Data:** **Files** adds CSV, Excel or text files that the code reads by name (`pd.read_csv("data.csv")`); files the code writes can be downloaded from there.
- **Examples:** NumPy, pandas, plotting, linear regression (with gradient descent), classification, k-means, a neural network written from scratch in NumPy, and handwritten-digit recognition with an MLP.
- **Saving:** kept in the browser automatically; **Download** / **Open** use the Jupyter `.ipynb` format, so notebooks move to and from Jupyter, VS Code and Google Colab.
- Suggestions come from the live variables (type `df.` and press <kbd>Ctrl</kbd>+<kbd>Space</kbd>), and common errors get a hint, for example a variable from a cell that has not run yet, or a library that is not installed (with an **Install** button).
- **Limits:** Python runs in WebAssembly on one core with no GPU. PyTorch and TensorFlow do not run in WebAssembly, so deep learning is limited to small networks (NumPy, scikit-learn's `MLPClassifier`). On the website, **Stop** has to restart Python (clearing variables); the desktop app stops just the cell.

The kernel is `notebook-runner.js` (Pyodide in a worker); the page is `notebook.js`, and the examples are in `notebook-examples.js`.

## Desktop app (offline, with exam mode)

For computers with no internet, such as an exam hall, the playground is also a desktop app called **Playground** for **Windows** and **macOS** (Apple Silicon and Intel). All four languages, the editor, fonts, examples and the guide are inside it, and it never uses the network. **Download it from the [Releases page](https://github.com/MAZHAR1807102/c-cpp-playground/releases/latest).**

- **Windows:** `…-Windows-Setup.exe` installs it; `…-Windows-Portable.exe` runs without installing (for example from a USB stick). The first time, Windows may show "Windows protected your PC": click **More info → Run anyway**.
- **Mac:** open the `.dmg` and drag the app to Applications. The first time, macOS blocks it: open **System Settings → Privacy & Security** and click **Open Anyway**. If it says the app "is damaged", run `xattr -cr /Applications/Playground.app` once in Terminal.
- **Files:** New, Open… and Save (Ctrl/Cmd + N, O, S) work with `.c`, `.cpp`, `.java` and `.py` files, and with `.ipynb` notebooks in the notebook. Closing with unsaved changes asks first.
- **Pages:** **View → Code editor** (Ctrl/Cmd + 1), **Algorithm animations** (Ctrl/Cmd + 2), **C++ STL guide** (Ctrl/Cmd + 3) and **Notebook** (Ctrl/Cmd + 4) and **Practice** (Ctrl/Cmd + 5); **Window** chooses which tabs are shown. Exam mode hides the animations, the STL guide and Practice along with the other aids.
- **Notebook:** The app carries numpy, pandas, scipy, scikit-learn, matplotlib, seaborn, statsmodels, sympy, networkx and openpyxl, so the notebook works offline; other libraries need the website.
- **Exam mode:** **Exam → Start exam mode…** and choose a password. Suggestions, error hints, the examples and the guide are turned off, links are blocked and an "Exam mode" badge is shown. It stays on after the app restarts until **Exam → End exam mode…** with the same password. (The password is stored hashed in the app's settings file; it stops students from switching the aids back on in the app, but it is not protection against someone who edits files on the computer.)

The app's source is in [`desktop/`](desktop/). Pushing a tag such as `desktop-v1.0.2` makes GitHub Actions build both versions and publish them as a release.

## Not supported

- C++ exceptions (`throw`, `try`): the bundled libc++ is built without exception support, so C++ is compiled with `-fno-exceptions`.
- Python packages in the code editor (use the notebook for numpy, pandas and the rest); PyTorch and TensorFlow anywhere.
- Java: classes that TeaVM's library does not implement; catching an out-of-bounds array access (it stops the program); output while a Java program is still running (it appears when the program finishes). A Java run, compiling included, is stopped after 10 seconds.
- Threads, sockets, and interactive input while the program is running.

Plain HTML, CSS and JavaScript; no build step. To run locally, serve the folder over HTTP (module workers do not load from `file://`), for example `npx http-server .`.

Made by Mazharul Islam.
