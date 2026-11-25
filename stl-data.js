// C++ STL guide for stl.html: each topic has a short explanation, a table of the main operations
// ([syntax, what it does, time]) and runnable examples ({ title, code, input }).
window.STL = [
{ id: 'vector', group: 'Sequence containers', title: 'vector', header: '<vector>',
  about: 'A dynamic array: elements sit next to each other in memory, it grows as you add to the end, and any element can be reached by index in constant time. The container to use unless you have a reason not to.',
  rows: [
    ['vector<int> v;', 'empty vector', ''],
    ['vector<int> v(n, x);', 'n copies of x (x defaults to 0)', 'O(n)'],
    ['vector<int> v = {1, 2, 3};', 'from a list of values', ''],
    ['v.push_back(x);  v.emplace_back(x);', 'add at the end', 'O(1) amortised'],
    ['v.pop_back();', 'remove the last element', 'O(1)'],
    ['v[i]   v.at(i)', 'element i (at() checks the index)', 'O(1)'],
    ['v.front()   v.back()', 'first / last element', 'O(1)'],
    ['v.size()   v.empty()', 'number of elements / is it empty', 'O(1)'],
    ['v.insert(v.begin() + i, x);', 'insert before position i', 'O(n)'],
    ['v.erase(v.begin() + i);', 'remove position i', 'O(n)'],
    ['v.clear();   v.resize(n);', 'remove all / change the size', 'O(n)'],
    ['vector<vector<int>> g(r, vector<int>(c));', 'an r × c 2-D grid', 'O(r·c)']
  ],
  examples: [
    { title: 'Basics: add, read, remove, loop', code: String.raw`#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> v = {10, 20, 30};
    v.push_back(40);                 // 10 20 30 40
    v.insert(v.begin() + 1, 15);     // 10 15 20 30 40
    v.pop_back();                    // 10 15 20 30
    v.erase(v.begin());              // 15 20 30

    cout << "size " << v.size() << ", front " << v.front() << ", back " << v.back() << "\n";
    for (int x : v) cout << x << " ";          // range-based for loop
    cout << "\n";
    for (size_t i = 0; i < v.size(); i++)      // by index (size() is unsigned, so i is size_t)
        cout << "v[" << i << "] = " << v[i] << "\n";
    return 0;
}
` },
    { title: 'Read n numbers and a 2-D grid', input: '5\n3 1 4 1 5\n2 3\n1 2 3\n4 5 6', code: String.raw`#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> a(n);
    for (int &x : a) cin >> x;       // & so the loop writes into the vector
    long long sum = 0;
    for (int x : a) sum += x;
    cout << "sum = " << sum << "\n";

    int r, c;
    cin >> r >> c;
    vector<vector<int>> grid(r, vector<int>(c));
    for (auto &row : grid)
        for (int &x : row) cin >> x;
    for (int i = 0; i < r; i++) {
        for (int j = 0; j < c; j++) cout << grid[i][j] * 10 << " ";
        cout << "\n";
    }
    return 0;
}
` }
  ] },

{ id: 'string', group: 'Sequence containers', title: 'string', header: '<string>',
  about: 'A sequence of characters that manages its own memory. It works like a vector<char> with extra text functions. Compare with ==, <; join with +.',
  rows: [
    ['string s = "hello";', 'create', ''],
    ['s.size()   s.length()', 'number of characters', 'O(1)'],
    ['s[i]   s.back()', 'character i / last character', 'O(1)'],
    ['s += "abc";   s.push_back(c);', 'append', 'O(k)'],
    ['s.substr(pos, len)', 'part of the string', 'O(len)'],
    ['s.find("lo")', 'index of the first match, or string::npos', 'O(n·m)'],
    ['s.replace(pos, len, "x")', 'replace a part', 'O(n)'],
    ['s.insert(pos, "x")   s.erase(pos, len)', 'insert / delete characters', 'O(n)'],
    ['getline(cin, s);', 'read a whole line (with spaces)', ''],
    ['to_string(42)   stoi("42")   stod("3.5")', 'number ↔ text', ''],
    ['reverse(s.begin(), s.end());', 'reverse (from <algorithm>)', 'O(n)'],
    ['isdigit(c)  isalpha(c)  toupper(c)', 'character tests and case (from <cctype>)', 'O(1)']
  ],
  examples: [
    { title: 'Searching, slicing and changing text', code: String.raw`#include <iostream>
#include <string>
#include <algorithm>
using namespace std;

int main() {
    string s = "hello world";
    cout << s.size() << " characters\n";
    cout << "first word: " << s.substr(0, 5) << "\n";
    size_t pos = s.find("world");
    if (pos != string::npos) cout << "\"world\" starts at " << pos << "\n";
    s.replace(pos, 5, "C++");
    cout << s << "\n";
    s += "!";
    string upper = s;
    for (char &c : upper) c = toupper((unsigned char)c);
    cout << upper << "\n";
    reverse(s.begin(), s.end());
    cout << s << "\n";
    cout << "number to text: " << to_string(3 * 14) + "!" << ", text to number: " << stoi("123") + 1 << "\n";
    return 0;
}
` },
    { title: 'Read lines and split words with stringstream', input: 'the quick brown fox\njumps over the lazy dog', code: String.raw`#include <iostream>
#include <sstream>
#include <string>
using namespace std;

int main() {
    string line;
    int lineNo = 0;
    while (getline(cin, line)) {          // one whole line, spaces included
        lineNo++;
        stringstream ss(line);
        string word;
        int words = 0;
        while (ss >> word) words++;       // >> splits at spaces
        cout << "line " << lineNo << ": " << words << " words, " << line.size() << " characters\n";
    }
    return 0;
}
` }
  ] },

{ id: 'array', group: 'Sequence containers', title: 'array', header: '<array>',
  about: 'A fixed-size array whose size is part of its type. Unlike a plain C array it knows its size, can be copied and compared, and works with the algorithms.',
  rows: [
    ['array<int, 5> a = {1, 2, 3, 4, 5};', 'five ints', ''],
    ['a.size()', 'the fixed size', 'O(1)'],
    ['a[i]   a.front()   a.back()', 'access', 'O(1)'],
    ['a.fill(0);', 'set every element', 'O(n)'],
    ['a == b   a < b', 'compare element by element', 'O(n)']
  ],
  examples: [
    { title: 'Fixed-size array', code: String.raw`#include <iostream>
#include <array>
#include <algorithm>
using namespace std;

int main() {
    array<int, 6> a = {5, 2, 9, 1, 7, 3};
    sort(a.begin(), a.end());
    for (int x : a) cout << x << " ";
    cout << "\nsize " << a.size() << ", smallest " << a.front() << ", largest " << a.back() << "\n";
    array<int, 6> b = a;      // a real copy
    b.fill(0);
    cout << "a[0] = " << a[0] << ", b[0] = " << b[0] << ", equal: " << boolalpha << (a == b) << "\n";
    return 0;
}
` }
  ] },

{ id: 'deque', group: 'Sequence containers', title: 'deque', header: '<deque>',
  about: 'A double-ended queue: fast insertion and removal at both the front and the back, with indexing like a vector.',
  rows: [
    ['push_back(x)   push_front(x)', 'add at either end', 'O(1)'],
    ['pop_back()   pop_front()', 'remove from either end', 'O(1)'],
    ['d[i]   d.front()   d.back()', 'access', 'O(1)']
  ],
  examples: [
    { title: 'Both ends, and a sliding-window maximum', code: String.raw`#include <iostream>
#include <deque>
#include <vector>
using namespace std;

int main() {
    deque<int> d;
    d.push_back(2);
    d.push_back(3);
    d.push_front(1);       // 1 2 3
    d.push_front(0);       // 0 1 2 3
    d.pop_back();          // 0 1 2
    for (int x : d) cout << x << " ";
    cout << "\n";

    // the largest value in every window of k numbers, keeping indexes of useful candidates in a deque
    vector<int> a = {1, 3, -1, -3, 5, 3, 6, 7};
    int k = 3;
    deque<int> q;
    cout << "window maxima: ";
    for (int i = 0; i < (int)a.size(); i++) {
        while (!q.empty() && q.front() <= i - k) q.pop_front();     // left the window
        while (!q.empty() && a[q.back()] <= a[i]) q.pop_back();     // can never be the maximum again
        q.push_back(i);
        if (i >= k - 1) cout << a[q.front()] << " ";
    }
    cout << "\n";
    return 0;
}
` }
  ] },

{ id: 'list', group: 'Sequence containers', title: 'list', header: '<list>',
  about: 'A doubly linked list: inserting or removing anywhere is constant time once you have an iterator, but there is no indexing (no l[i]).',
  rows: [
    ['push_back / push_front / pop_back / pop_front', 'ends', 'O(1)'],
    ['l.insert(it, x)   l.erase(it)', 'at an iterator position', 'O(1)'],
    ['l.remove(x)', 'remove every element equal to x', 'O(n)'],
    ['l.sort()   l.reverse()   l.unique()', 'list versions of the algorithms', 'O(n log n) / O(n)'],
    ['l.splice(it, other)', 'move all of another list in, without copying', 'O(1)']
  ],
  examples: [
    { title: 'Linked list operations', code: String.raw`#include <iostream>
#include <list>
#include <iterator>
using namespace std;

void show(const list<int> &l) {
    for (int x : l) cout << x << " ";
    cout << "\n";
}

int main() {
    list<int> l = {4, 1, 3, 1, 2};
    l.push_front(0);
    show(l);                        // 0 4 1 3 1 2
    l.remove(1);
    show(l);                        // 0 4 3 2
    auto it = next(l.begin(), 2);   // iterator to the third element
    l.insert(it, 99);
    show(l);                        // 0 4 99 3 2
    l.sort();
    show(l);
    list<int> more = {7, 8};
    l.splice(l.end(), more);        // more is now empty
    show(l);
    cout << "more has " << more.size() << " elements\n";
    return 0;
}
` }
  ] },

{ id: 'stack', group: 'Container adaptors', title: 'stack', header: '<stack>',
  about: 'Last in, first out. Only the top element can be seen. Used for undo, matching brackets, depth-first search and evaluating expressions.',
  rows: [
    ['st.push(x)', 'put on top', 'O(1)'],
    ['st.top()', 'look at the top', 'O(1)'],
    ['st.pop()', 'remove the top (returns nothing)', 'O(1)'],
    ['st.empty()   st.size()', 'state', 'O(1)']
  ],
  examples: [
    { title: 'Balanced brackets', input: '{[()()]}\n([)]\n((', code: String.raw`#include <iostream>
#include <stack>
#include <string>
using namespace std;

bool balanced(const string &s) {
    stack<char> st;
    for (char c : s) {
        if (c == '(' || c == '[' || c == '{') st.push(c);
        else {
            if (st.empty()) return false;
            char open = st.top();
            st.pop();
            if ((c == ')' && open != '(') || (c == ']' && open != '[') || (c == '}' && open != '{')) return false;
        }
    }
    return st.empty();     // every opening bracket must have been closed
}

int main() {
    string s;
    while (cin >> s) cout << s << (balanced(s) ? "  balanced" : "  not balanced") << "\n";
    return 0;
}
` }
  ] },

{ id: 'queue', group: 'Container adaptors', title: 'queue', header: '<queue>',
  about: 'First in, first out, like a line of people. Used for breadth-first search and simulations.',
  rows: [
    ['q.push(x)', 'join at the back', 'O(1)'],
    ['q.front()   q.back()', 'first / last in line', 'O(1)'],
    ['q.pop()', 'remove the front', 'O(1)'],
    ['q.empty()   q.size()', 'state', 'O(1)']
  ],
  examples: [
    { title: 'Shortest path in a grid (BFS)', code: String.raw`#include <iostream>
#include <queue>
#include <vector>
#include <string>
#include <utility>
using namespace std;

int main() {
    vector<string> grid = {
        "S.#.....",
        ".##.###.",
        "....#...",
        "##.##.#.",
        "......#E" };
    int R = grid.size(), C = grid[0].size();
    vector<vector<int>> dist(R, vector<int>(C, -1));
    queue<pair<int, int>> q;
    q.push({0, 0});
    dist[0][0] = 0;
    int dr[] = {1, -1, 0, 0}, dc[] = {0, 0, 1, -1};
    while (!q.empty()) {
        auto [r, c] = q.front();       // structured binding (C++17)
        q.pop();
        for (int k = 0; k < 4; k++) {
            int nr = r + dr[k], nc = c + dc[k];
            if (nr < 0 || nc < 0 || nr >= R || nc >= C || grid[nr][nc] == '#' || dist[nr][nc] != -1) continue;
            dist[nr][nc] = dist[r][c] + 1;
            q.push({nr, nc});
        }
    }
    cout << "shortest path from S to E: " << dist[R - 1][C - 1] << " steps\n";
    return 0;
}
` }
  ] },

{ id: 'priority_queue', group: 'Container adaptors', title: 'priority_queue', header: '<queue>',
  about: 'A heap: top() is always the largest element (or the smallest with greater<>). Used for Dijkstra, scheduling, and "k largest" problems.',
  rows: [
    ['priority_queue<int> pq;', 'max-heap: top() is the largest', ''],
    ['priority_queue<int, vector<int>, greater<int>> pq;', 'min-heap: top() is the smallest', ''],
    ['pq.push(x)', 'add', 'O(log n)'],
    ['pq.top()', 'the largest (or smallest)', 'O(1)'],
    ['pq.pop()', 'remove the top', 'O(log n)']
  ],
  examples: [
    { title: 'Max-heap, min-heap and k largest', code: String.raw`#include <iostream>
#include <queue>
#include <vector>
#include <functional>
using namespace std;

int main() {
    vector<int> a = {5, 1, 8, 3, 9, 2, 7};
    priority_queue<int> maxHeap(a.begin(), a.end());
    cout << "largest first: ";
    while (!maxHeap.empty()) { cout << maxHeap.top() << " "; maxHeap.pop(); }

    priority_queue<int, vector<int>, greater<int>> minHeap(a.begin(), a.end());
    cout << "\nsmallest first: ";
    while (!minHeap.empty()) { cout << minHeap.top() << " "; minHeap.pop(); }

    // the 3 largest values: keep a min-heap of size 3
    priority_queue<int, vector<int>, greater<int>> top3;
    for (int x : a) {
        top3.push(x);
        if (top3.size() > 3) top3.pop();      // drop the smallest
    }
    cout << "\n3 largest: ";
    while (!top3.empty()) { cout << top3.top() << " "; top3.pop(); }
    cout << "\n";
    return 0;
}
` },
    { title: "Dijkstra's shortest paths", code: String.raw`#include <iostream>
#include <queue>
#include <vector>
#include <climits>
#include <functional>
#include <utility>
using namespace std;

int main() {
    int n = 5;
    vector<vector<pair<int, int>>> adj(n);       // adj[u] = {(v, weight)}
    auto edge = [&](int u, int v, int w) { adj[u].push_back({v, w}); adj[v].push_back({u, w}); };
    edge(0, 1, 4); edge(0, 2, 1); edge(2, 1, 2); edge(1, 3, 1); edge(2, 3, 5); edge(3, 4, 3);

    vector<int> dist(n, INT_MAX);
    priority_queue<pair<int, int>, vector<pair<int, int>>, greater<pair<int, int>>> pq;   // (distance, vertex)
    dist[0] = 0;
    pq.push({0, 0});
    while (!pq.empty()) {
        auto [d, u] = pq.top();
        pq.pop();
        if (d > dist[u]) continue;               // an old, longer entry
        for (auto [v, w] : adj[u])
            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                pq.push({dist[v], v});
            }
    }
    for (int v = 0; v < n; v++) cout << "0 -> " << v << ": " << dist[v] << "\n";
    return 0;
}
` }
  ] },

{ id: 'set', group: 'Associative containers', title: 'set and multiset', header: '<set>',
  about: 'Sorted collections. A set keeps each value once; a multiset allows repeats. Lookups, inserts and erases are O(log n), and iterating gives the values in order.',
  rows: [
    ['s.insert(x)', 'add (a set ignores duplicates)', 'O(log n)'],
    ['s.erase(x)', 'remove the value (a multiset removes all copies)', 'O(log n)'],
    ['ms.erase(ms.find(x))', 'remove one copy from a multiset', 'O(log n)'],
    ['s.count(x)   s.contains(x)', 'is it there (contains: C++20)', 'O(log n)'],
    ['s.find(x)', 'iterator to x, or s.end()', 'O(log n)'],
    ['s.lower_bound(x)', 'first element ≥ x', 'O(log n)'],
    ['s.upper_bound(x)', 'first element > x', 'O(log n)'],
    ['*s.begin()   *s.rbegin()', 'smallest / largest', 'O(1)']
  ],
  examples: [
    { title: 'Unique sorted values and lower_bound', code: String.raw`#include <iostream>
#include <set>
using namespace std;

int main() {
    set<int> s = {5, 1, 9, 1, 5, 3};    // duplicates are dropped
    s.insert(7);
    for (int x : s) cout << x << " ";   // always in order
    cout << "\nsize " << s.size() << ", smallest " << *s.begin() << ", largest " << *s.rbegin() << "\n";
    cout << "contains 3? " << (s.count(3) ? "yes" : "no") << "\n";
    auto it = s.lower_bound(6);          // first value >= 6
    cout << "first value >= 6: " << *it << "\n";
    s.erase(9);

    multiset<int> ms = {4, 2, 4, 4, 1};
    cout << "4 appears " << ms.count(4) << " times\n";
    ms.erase(ms.find(4));                // remove just one 4
    for (int x : ms) cout << x << " ";
    cout << "\n";
    return 0;
}
` }
  ] },

{ id: 'map', group: 'Associative containers', title: 'map and multimap', header: '<map>',
  about: 'Key → value pairs, sorted by key. m[key] creates the entry (with a default value) if it is missing, which makes counting easy.',
  rows: [
    ['m[key] = value;', 'set (creates the key if missing)', 'O(log n)'],
    ['m[key]++', 'count occurrences', 'O(log n)'],
    ['m.count(key)   m.contains(key)', 'is the key present', 'O(log n)'],
    ['m.find(key)', 'iterator, or m.end()', 'O(log n)'],
    ['m.erase(key)', 'remove', 'O(log n)'],
    ['for (auto &[k, v] : m)', 'loop in key order (C++17)', 'O(n)'],
    ['m.insert({key, value})', 'add only if the key is new', 'O(log n)']
  ],
  examples: [
    { title: 'Word frequencies', input: 'the cat and the dog and the bird', code: String.raw`#include <iostream>
#include <map>
#include <string>
using namespace std;

int main() {
    map<string, int> freq;
    string w;
    while (cin >> w) freq[w]++;          // missing words start at 0
    for (auto &[word, count] : freq)     // sorted by word
        cout << word << ": " << count << "\n";
    if (freq.find("cat") != freq.end()) cout << "cat is there\n";
    cout << "distinct words: " << freq.size() << "\n";
    return 0;
}
` },
    { title: 'Phone book with multimap', code: String.raw`#include <iostream>
#include <map>
#include <string>
using namespace std;

int main() {
    multimap<string, string> phones;     // one name can have several numbers
    phones.insert({"Asha", "0171-111"});
    phones.insert({"Bilal", "0181-222"});
    phones.insert({"Asha", "0191-333"});
    auto [first, last] = phones.equal_range("Asha");
    cout << "Asha's numbers:";
    for (auto it = first; it != last; ++it) cout << " " << it->second;
    cout << "\n";
    return 0;
}
` }
  ] },

{ id: 'unordered', group: 'Associative containers', title: 'unordered_set and unordered_map', header: '<unordered_set>, <unordered_map>',
  about: 'Hash tables: the same operations as set and map, but O(1) on average and with no order. Use them when you only need to look things up.',
  rows: [
    ['unordered_map<string, int> m;', 'hash map', ''],
    ['m[key]   m.count(key)   m.erase(key)', 'like map', 'O(1) average'],
    ['unordered_set<int> s;   s.insert(x)', 'hash set', 'O(1) average'],
    ['m.reserve(n)', 'make room for n elements in advance', 'O(n)']
  ],
  examples: [
    { title: 'Two-sum and first repeated value', code: String.raw`#include <iostream>
#include <unordered_map>
#include <unordered_set>
#include <vector>
using namespace std;

int main() {
    vector<int> a = {2, 7, 11, 15, 7, 3};
    int target = 18;
    unordered_map<int, int> seen;            // value -> index
    for (int i = 0; i < (int)a.size(); i++) {
        if (seen.count(target - a[i])) {
            cout << "a[" << seen[target - a[i]] << "] + a[" << i << "] = " << target << "\n";
            break;
        }
        seen[a[i]] = i;
    }
    unordered_set<int> s;
    for (int x : a) {
        if (!s.insert(x).second) {           // insert returns false in .second if x was already there
            cout << "first repeated value: " << x << "\n";
            break;
        }
    }
    return 0;
}
` }
  ] },

{ id: 'pair', group: 'Utilities', title: 'pair and tuple', header: '<utility>, <tuple>',
  about: 'Group two (pair) or more (tuple) values. Pairs compare by first, then second, so sorting a vector of pairs sorts by the first value.',
  rows: [
    ['pair<int, string> p = {1, "a"};', 'two values', ''],
    ['p.first   p.second', 'the parts', ''],
    ['make_pair(1, "a")', 'build a pair', ''],
    ['tuple<int, char, double> t = {1, \'x\', 2.5};', 'three or more values', ''],
    ['get<0>(t)', 'part 0 of a tuple', ''],
    ['auto [a, b] = p;', 'structured binding: unpack (C++17)', '']
  ],
  examples: [
    { title: 'Sorting pairs and unpacking', code: String.raw`#include <iostream>
#include <vector>
#include <string>
#include <tuple>
#include <algorithm>
using namespace std;

tuple<int, int, int> minMaxSum(const vector<int> &v) {   // return several values at once
    int mn = v[0], mx = v[0], s = 0;
    for (int x : v) { mn = min(mn, x); mx = max(mx, x); s += x; }
    return {mn, mx, s};
}

int main() {
    vector<pair<int, string>> scores = {{72, "Bilal"}, {91, "Asha"}, {72, "Chen"}, {85, "Dana"}};
    sort(scores.begin(), scores.end());          // by score, then by name
    for (auto &[score, name] : scores) cout << name << " " << score << "\n";

    auto [mn, mx, sum] = minMaxSum({4, 9, 1, 7});
    cout << "min " << mn << ", max " << mx << ", sum " << sum << "\n";
    return 0;
}
` }
  ] },

{ id: 'bitset', group: 'Utilities', title: 'bitset', header: '<bitset>',
  about: 'A fixed number of bits with fast bitwise operations. Handy for showing numbers in binary and for sets of small integers.',
  rows: [
    ['bitset<8> b(13);', '13 as 8 bits: 00001101', ''],
    ['b[i]   b.set(i)   b.reset(i)   b.flip(i)', 'read / set / clear / toggle bit i', 'O(1)'],
    ['b.count()', 'how many bits are 1', 'O(n/64)'],
    ['b.to_string()   b.to_ulong()', 'convert', ''],
    ['a & b   a | b   a ^ b   b << 2', 'bitwise operations', 'O(n/64)']
  ],
  examples: [
    { title: 'Binary view and bit operations', code: String.raw`#include <iostream>
#include <bitset>
using namespace std;

int main() {
    bitset<8> a(13), b(6);                 // 00001101 and 00000110
    cout << "a     = " << a << " (" << a.to_ulong() << ")\n";
    cout << "b     = " << b << " (" << b.to_ulong() << ")\n";
    cout << "a & b = " << (a & b) << "\n";
    cout << "a | b = " << (a | b) << "\n";
    cout << "a ^ b = " << (a ^ b) << "\n";
    cout << "a << 2 = " << (a << 2) << "\n";
    a.flip(0);
    cout << "a with bit 0 flipped = " << a << ", ones: " << a.count() << "\n";
    return 0;
}
` }
  ] },

{ id: 'iterators', group: 'Utilities', title: 'Iterators', header: '<iterator>',
  about: 'Iterators point at elements and let the same algorithms work on every container. begin() points at the first element, end() just past the last.',
  rows: [
    ['v.begin()   v.end()', 'first / one past the last', 'O(1)'],
    ['v.rbegin()   v.rend()', 'reverse iterators', 'O(1)'],
    ['*it   it->member', 'the element it points to', 'O(1)'],
    ['++it   --it', 'next / previous', 'O(1)'],
    ['next(it, k)   prev(it, k)   advance(it, k)', 'move k steps', 'O(1) or O(k)'],
    ['distance(a, b)', 'number of steps from a to b', 'O(1) or O(n)']
  ],
  examples: [
    { title: 'Walking containers with iterators', code: String.raw`#include <iostream>
#include <vector>
#include <map>
#include <string>
#include <iterator>
using namespace std;

int main() {
    vector<int> v = {10, 20, 30, 40, 50};
    for (auto it = v.begin(); it != v.end(); ++it) cout << *it << " ";
    cout << "\nbackwards: ";
    for (auto it = v.rbegin(); it != v.rend(); ++it) cout << *it << " ";
    auto it = next(v.begin(), 2);
    cout << "\nthird element: " << *it << ", index " << distance(v.begin(), it) << "\n";

    map<string, int> age = {{"Asha", 20}, {"Bilal", 19}};
    for (auto m = age.begin(); m != age.end(); ++m) cout << m->first << " is " << m->second << "\n";
    return 0;
}
` }
  ] },

{ id: 'lambda', group: 'Utilities', title: 'Lambdas and comparators', header: '<functional>',
  about: 'A lambda is a small unnamed function written in place: [capture](parameters) { body }. Algorithms take them to decide how to compare, test or change elements.',
  rows: [
    ['[](int a, int b) { return a > b; }', 'a comparator: sort in descending order', ''],
    ['[&]  [=]  [x, &y]', 'capture outer variables by reference / by copy', ''],
    ['greater<int>()   less<int>()', 'ready-made comparators', ''],
    ['function<int(int)> f = …;', 'store any callable (also recursive lambdas)', '']
  ],
  examples: [
    { title: 'Custom sorting and captures', code: String.raw`#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <functional>
using namespace std;

struct Student { string name; int marks; };

int main() {
    vector<Student> st = {{"Asha", 81}, {"Bilal", 67}, {"Chen", 92}, {"Dana", 81}};
    // highest marks first; equal marks in alphabetical order
    sort(st.begin(), st.end(), [](const Student &a, const Student &b) {
        if (a.marks != b.marks) return a.marks > b.marks;
        return a.name < b.name;
    });
    for (auto &s : st) cout << s.name << " " << s.marks << "\n";

    int passMark = 70;
    auto passed = count_if(st.begin(), st.end(), [passMark](const Student &s) { return s.marks >= passMark; });
    cout << passed << " passed\n";

    vector<int> v = {3, 1, 2};
    sort(v.begin(), v.end(), greater<int>());
    for (int x : v) cout << x << " ";

    function<long long(int)> fact = [&](int n) { return n <= 1 ? 1LL : n * fact(n - 1); };   // recursive
    cout << "\n10! = " << fact(10) << "\n";
    return 0;
}
` }
  ] },

{ id: 'sorting', group: 'Algorithms', title: 'Sorting', header: '<algorithm>',
  about: 'sort is O(n log n). stable_sort keeps equal elements in their original order. partial_sort and nth_element do less work when you only need part of the order.',
  rows: [
    ['sort(v.begin(), v.end());', 'ascending', 'O(n log n)'],
    ['sort(v.rbegin(), v.rend());', 'descending', 'O(n log n)'],
    ['sort(v.begin(), v.end(), cmp);', 'with a comparator', 'O(n log n)'],
    ['stable_sort(…)', 'equal elements keep their order', 'O(n log n)'],
    ['partial_sort(b, b + k, e);', 'only the first k in order', 'O(n log k)'],
    ['nth_element(b, b + k, e);', 'element k in its sorted place', 'O(n)'],
    ['is_sorted(b, e)', 'check', 'O(n)']
  ],
  examples: [
    { title: 'sort, stable_sort, partial_sort, nth_element', code: String.raw`#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

void show(const char *label, const vector<int> &v) {
    cout << label;
    for (int x : v) cout << x << " ";
    cout << "\n";
}

int main() {
    vector<int> v = {7, 2, 9, 4, 1, 8, 3};
    vector<int> a = v;
    sort(a.begin(), a.end());
    show("ascending:  ", a);
    sort(a.rbegin(), a.rend());
    show("descending: ", a);

    a = v;
    partial_sort(a.begin(), a.begin() + 3, a.end());
    show("3 smallest first: ", a);

    a = v;
    nth_element(a.begin(), a.begin() + a.size() / 2, a.end());
    cout << "median: " << a[a.size() / 2] << "\n";

    // stable_sort by last digit keeps 21 before 11 (their original order)
    vector<int> w = {21, 13, 11, 32, 3};
    stable_sort(w.begin(), w.end(), [](int x, int y) { return x % 10 < y % 10; });
    show("by last digit: ", w);
    return 0;
}
` }
  ] },

{ id: 'searching', group: 'Algorithms', title: 'Searching', header: '<algorithm>',
  about: 'find and count look at every element. On a sorted range, binary_search, lower_bound and upper_bound find things in O(log n).',
  rows: [
    ['find(b, e, x)', 'iterator to the first x, or e', 'O(n)'],
    ['find_if(b, e, pred)', 'first element where pred is true', 'O(n)'],
    ['count(b, e, x)   count_if(b, e, pred)', 'how many', 'O(n)'],
    ['binary_search(b, e, x)', 'is x there (sorted range)', 'O(log n)'],
    ['lower_bound(b, e, x)', 'first element ≥ x (sorted)', 'O(log n)'],
    ['upper_bound(b, e, x)', 'first element > x (sorted)', 'O(log n)'],
    ['equal_range(b, e, x)', 'both bounds: all copies of x', 'O(log n)']
  ],
  examples: [
    { title: 'Linear and binary search', code: String.raw`#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    vector<int> v = {4, 8, 15, 16, 23, 42, 15};
    auto it = find(v.begin(), v.end(), 15);
    if (it != v.end()) cout << "15 first at index " << it - v.begin() << "\n";
    cout << "15 appears " << count(v.begin(), v.end(), 15) << " times\n";
    auto big = find_if(v.begin(), v.end(), [](int x) { return x > 20; });
    cout << "first value over 20: " << *big << "\n";

    sort(v.begin(), v.end());                 // 4 8 15 15 16 23 42
    cout << "has 23? " << (binary_search(v.begin(), v.end(), 23) ? "yes" : "no") << "\n";
    auto lo = lower_bound(v.begin(), v.end(), 15);
    auto hi = upper_bound(v.begin(), v.end(), 15);
    cout << "15 is at indexes " << lo - v.begin() << " to " << hi - v.begin() - 1 << "\n";
    cout << "values below 16: " << lower_bound(v.begin(), v.end(), 16) - v.begin() << "\n";
    return 0;
}
` }
  ] },

{ id: 'minmax', group: 'Algorithms', title: 'min, max and clamp', header: '<algorithm>',
  about: 'min and max compare two values (or a list in braces); the _element versions return an iterator to the smallest or largest element of a range.',
  rows: [
    ['min(a, b)   max(a, b)', 'smaller / larger of two', 'O(1)'],
    ['min({a, b, c})', 'of a list', 'O(n)'],
    ['*min_element(b, e)   *max_element(b, e)', 'smallest / largest in a range', 'O(n)'],
    ['minmax_element(b, e)', 'both at once (a pair of iterators)', 'O(n)'],
    ['clamp(x, lo, hi)', 'x limited to [lo, hi] (C++17)', 'O(1)']
  ],
  examples: [
    { title: 'Smallest, largest and where they are', code: String.raw`#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    cout << max(3, 7) << " " << min({5, 2, 8, 1}) << "\n";
    vector<int> v = {12, 5, 31, 7, 31, 2};
    auto mx = max_element(v.begin(), v.end());
    cout << "largest " << *mx << " at index " << mx - v.begin() << "\n";
    auto [lo, hi] = minmax_element(v.begin(), v.end());
    cout << "range " << *lo << " to " << *hi << "\n";
    for (int marks : {-5, 45, 130}) cout << marks << " clamped to 0..100: " << clamp(marks, 0, 100) << "\n";
    return 0;
}
` }
  ] },

{ id: 'modifying', group: 'Algorithms', title: 'Changing ranges', header: '<algorithm>',
  about: 'Algorithms that rearrange or rewrite elements. remove and unique do not shrink the container: they move the kept elements forward, and erase removes the rest (the erase–remove idiom).',
  rows: [
    ['reverse(b, e)', 'reverse in place', 'O(n)'],
    ['rotate(b, mid, e)', 'mid becomes the first element', 'O(n)'],
    ['fill(b, e, x)', 'set every element to x', 'O(n)'],
    ['transform(b, e, out, f)', 'out[i] = f(in[i])', 'O(n)'],
    ['replace(b, e, old, new)', 'replace values', 'O(n)'],
    ['v.erase(remove(b, e, x), e)', 'delete every x', 'O(n)'],
    ['v.erase(unique(b, e), e)', 'delete adjacent duplicates (sort first)', 'O(n)'],
    ['swap(a, b)', 'exchange two values', 'O(1)']
  ],
  examples: [
    { title: 'reverse, rotate, transform, erase–remove, unique', code: String.raw`#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

void show(const char *label, const vector<int> &v) {
    cout << label;
    for (int x : v) cout << x << " ";
    cout << "\n";
}

int main() {
    vector<int> v = {1, 2, 3, 4, 5, 6};
    reverse(v.begin(), v.end());
    show("reversed: ", v);
    rotate(v.begin(), v.begin() + 2, v.end());
    show("rotated by 2: ", v);
    transform(v.begin(), v.end(), v.begin(), [](int x) { return x * x; });
    show("squared: ", v);

    vector<int> w = {3, 1, 3, 2, 3, 4};
    w.erase(remove(w.begin(), w.end(), 3), w.end());
    show("without 3s: ", w);

    vector<int> d = {5, 1, 5, 2, 1, 5};
    sort(d.begin(), d.end());
    d.erase(unique(d.begin(), d.end()), d.end());
    show("distinct: ", d);
    return 0;
}
` }
  ] },

{ id: 'numeric', group: 'Algorithms', title: 'Numeric algorithms', header: '<numeric>',
  about: 'Sums, running totals and number theory. Give accumulate a 0LL start value when the sum may not fit in an int.',
  rows: [
    ['accumulate(b, e, 0)', 'sum (or any fold with a 4th argument)', 'O(n)'],
    ['partial_sum(b, e, out)', 'running totals (prefix sums)', 'O(n)'],
    ['adjacent_difference(b, e, out)', 'differences of neighbours', 'O(n)'],
    ['inner_product(b, e, b2, 0)', 'dot product', 'O(n)'],
    ['iota(b, e, start)', 'fill with start, start+1, …', 'O(n)'],
    ['gcd(a, b)   lcm(a, b)', 'greatest common divisor / least common multiple (C++17)', 'O(log n)']
  ],
  examples: [
    { title: 'Sums, prefix sums and gcd', code: String.raw`#include <iostream>
#include <vector>
#include <numeric>
#include <functional>
using namespace std;

int main() {
    vector<int> v(6);
    iota(v.begin(), v.end(), 1);                          // 1 2 3 4 5 6
    cout << "sum " << accumulate(v.begin(), v.end(), 0LL) << "\n";
    cout << "product " << accumulate(v.begin(), v.end(), 1LL, multiplies<long long>()) << "\n";

    vector<int> prefix(v.size());
    partial_sum(v.begin(), v.end(), prefix.begin());
    cout << "prefix sums: ";
    for (int x : prefix) cout << x << " ";
    // sum of v[2..4] in O(1) from the prefix sums
    cout << "\nsum of v[2..4] = " << prefix[4] - prefix[1] << "\n";

    vector<int> w = {1, 0, 2, 1, 0, 3};
    cout << "dot product " << inner_product(v.begin(), v.end(), w.begin(), 0) << "\n";
    cout << "gcd(84, 36) = " << gcd(84, 36) << ", lcm(4, 6) = " << lcm(4, 6) << "\n";
    return 0;
}
` }
  ] },

{ id: 'permutations', group: 'Algorithms', title: 'Permutations and set operations', header: '<algorithm>',
  about: 'next_permutation steps through every ordering in lexicographic order (start from a sorted range). The set_ algorithms combine two sorted ranges.',
  rows: [
    ['next_permutation(b, e)', 'next ordering; false after the last', 'O(n)'],
    ['prev_permutation(b, e)', 'previous ordering', 'O(n)'],
    ['set_union(…, back_inserter(out))', 'in either (sorted inputs)', 'O(n + m)'],
    ['set_intersection(…)', 'in both', 'O(n + m)'],
    ['set_difference(…)', 'in the first only', 'O(n + m)'],
    ['includes(b1, e1, b2, e2)', 'is the second a subset of the first', 'O(n + m)']
  ],
  examples: [
    { title: 'All permutations and set operations', code: String.raw`#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <iterator>
using namespace std;

void show(const char *label, const vector<int> &v) {
    cout << label;
    for (int x : v) cout << x << " ";
    cout << "\n";
}

int main() {
    string s = "abc";                 // must start sorted to get them all
    do cout << s << " ";
    while (next_permutation(s.begin(), s.end()));
    cout << "\n";

    vector<int> a = {1, 2, 4, 5}, b = {2, 3, 5, 7}, out;
    set_union(a.begin(), a.end(), b.begin(), b.end(), back_inserter(out));
    show("union: ", out);
    out.clear();
    set_intersection(a.begin(), a.end(), b.begin(), b.end(), back_inserter(out));
    show("intersection: ", out);
    out.clear();
    set_difference(a.begin(), a.end(), b.begin(), b.end(), back_inserter(out));
    show("a minus b: ", out);
    return 0;
}
` }
  ] },

{ id: 'predicates', group: 'Algorithms', title: 'Testing every element', header: '<algorithm>',
  about: 'Ask a yes/no question of a whole range without writing the loop.',
  rows: [
    ['all_of(b, e, pred)', 'true if pred holds for every element', 'O(n)'],
    ['any_of(b, e, pred)', 'true if it holds for at least one', 'O(n)'],
    ['none_of(b, e, pred)', 'true if it holds for none', 'O(n)'],
    ['count_if(b, e, pred)', 'how many satisfy it', 'O(n)'],
    ['for_each(b, e, f)', 'call f on every element', 'O(n)']
  ],
  examples: [
    { title: 'all_of, any_of, none_of, count_if', code: String.raw`#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    vector<int> marks = {72, 55, 91, 64, 38};
    auto passed = [](int m) { return m >= 40; };
    cout << boolalpha;
    cout << "everyone passed: " << all_of(marks.begin(), marks.end(), passed) << "\n";
    cout << "anyone above 90: " << any_of(marks.begin(), marks.end(), [](int m) { return m > 90; }) << "\n";
    cout << "nobody got 100: " << none_of(marks.begin(), marks.end(), [](int m) { return m == 100; }) << "\n";
    cout << "number passed: " << count_if(marks.begin(), marks.end(), passed) << "\n";
    for_each(marks.begin(), marks.end(), [](int &m) { m += 5; });   // add 5 to every mark
    for (int m : marks) cout << m << " ";
    cout << "\n";
    return 0;
}
` }
  ] }
];
