// Header guide data: for each header, what it is for, its main functions (syntax + meaning) and a runnable example.
// Example programs use String.raw so that "\n" inside C strings stays as written.
window.HEADER_GUIDE = {
  c: [
    {
      h: 'stdio.h', about: 'Input and output: printing to the screen and reading what the user types.',
      items: [
        ['printf("format", values...);', 'Print formatted text. Codes: %d int, %ld long, %lld long long, %f double, %.2f two decimals, %c char, %s string, %% a percent sign.'],
        ['scanf("format", &var, ...);', 'Read values from input. Put & before each variable (not before a char array). Returns how many values were read.'],
        ['puts(s);', 'Print a string followed by a newline.'],
        ['putchar(c);  c = getchar();', 'Write one character / read one character. getchar returns EOF at the end of the input.'],
        ['fgets(buf, sizeof buf, stdin);', 'Read a whole line, spaces included (the \'\\n\' is kept). Returns NULL at the end of the input.'],
        ['sprintf(buf, "format", ...);', 'Like printf, but writes into the char array buf. snprintf(buf, n, ...) never writes more than n bytes.'],
        ['sscanf(s, "format", &var, ...);', 'Like scanf, but reads from the string s.'],
        ['EOF', 'The value (−1) that getchar and scanf return when there is no more input.']
      ],
      ex: String.raw`#include <stdio.h>

int main(void) {
    int x, count = 0;
    long long sum = 0;
    while (scanf("%d", &x) == 1) {   /* stops at end of input */
        sum += x;
        count++;
    }
    printf("read %d numbers\n", count);
    printf("sum = %lld, average = %.2f\n", sum, (double)sum / count);
    return 0;
}
`, input: '4 8 15 16 23 42'
    },
    {
      h: 'stdlib.h', about: 'General utilities: memory allocation, conversions, random numbers, sorting.',
      items: [
        ['int *p = malloc(n * sizeof *p);', 'Allocate memory for n values. Returns NULL if it fails. Release it with free(p).'],
        ['calloc(n, sizeof(T));', 'Allocate memory for n values, all set to zero.'],
        ['p = realloc(p, m * sizeof *p);', 'Resize an earlier allocation to m values, keeping the old contents.'],
        ['free(p);', 'Release memory from malloc, calloc or realloc.'],
        ['abs(x)  labs(x)  llabs(x)', 'Absolute value of an int, long and long long.'],
        ['rand()  srand(seed);', 'Pseudo-random number from 0 to RAND_MAX. Seed once with srand(time(NULL)). A number from 0 to n−1: rand() % n.'],
        ['atoi(s)  atof(s)  strtol(s, &end, base)', 'Convert text to int / double / long in a given base.'],
        ['qsort(a, n, sizeof a[0], cmp);', 'Sort an array. cmp(const void *x, const void *y) returns a negative number, 0 or a positive number.'],
        ['exit(code);', 'End the program at once with an exit code (0 means success).']
      ],
      ex: String.raw`#include <stdio.h>
#include <stdlib.h>

int cmp(const void *x, const void *y) {
    int a = *(const int *)x, b = *(const int *)y;
    return (a > b) - (a < b);          /* -1, 0 or 1 */
}

int main(void) {
    int n;
    scanf("%d", &n);
    int *a = malloc(n * sizeof *a);    /* an array whose size is known only at run time */
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);
    qsort(a, n, sizeof a[0], cmp);
    for (int i = 0; i < n; i++) printf("%d ", a[i]);
    printf("\nabs(-7) = %d, atoi(\"123\") + 1 = %d\n", abs(-7), atoi("123") + 1);
    free(a);
    return 0;
}
`, input: '6\n31 4 15 9 26 5'
    },
    {
      h: 'string.h', about: 'C strings: char arrays that end with the character \'\\0\'.',
      items: [
        ['strlen(s)', 'Number of characters before the \'\\0\'.'],
        ['strcpy(dst, src);  strncpy(dst, src, n);', 'Copy src into dst. dst must be big enough.'],
        ['strcat(dst, src);', 'Append src to the end of dst.'],
        ['strcmp(a, b)', '0 if equal, negative if a comes first in dictionary order, positive if b does. strncmp compares at most n characters.'],
        ['strchr(s, c)  strstr(s, sub)', 'Pointer to the first c / first sub in s, or NULL if not found.'],
        ['memset(a, 0, sizeof a);', 'Set every byte of a to a value (use 0 or −1 for int arrays).'],
        ['memcpy(dst, src, bytes);', 'Copy a block of memory.']
      ],
      ex: String.raw`#include <stdio.h>
#include <string.h>

int main(void) {
    char word[100], copy[100];
    scanf("%99s", word);
    strcpy(copy, word);
    int n = strlen(word);
    for (int i = 0; i < n / 2; i++) {          /* reverse in place */
        char t = word[i]; word[i] = word[n - 1 - i]; word[n - 1 - i] = t;
    }
    printf("length %d, reversed %s\n", n, word);
    printf(strcmp(word, copy) == 0 ? "a palindrome\n" : "not a palindrome\n");
    strcat(copy, "!");
    printf("%s, 'd' found: %s\n", copy, strchr(copy, 'd') ? "yes" : "no");
    return 0;
}
`, input: 'racecar'
    },
    {
      h: 'math.h', about: 'Mathematical functions on double values. (Compilers need -lm to link them; the playground adds it.)',
      items: [
        ['sqrt(x)  pow(x, y)  cbrt(x)', 'Square root, x to the power y, cube root.'],
        ['fabs(x)', 'Absolute value of a double (abs is for int).'],
        ['floor(x)  ceil(x)  round(x)  trunc(x)', 'Round down, up, to the nearest, toward zero.'],
        ['sin(x)  cos(x)  tan(x)  atan2(y, x)', 'Trigonometry in radians. π = acos(-1).'],
        ['exp(x)  log(x)  log10(x)  log2(x)', 'e^x and logarithms (log is the natural log).'],
        ['fmod(x, y)  hypot(x, y)', 'Remainder of x / y for doubles; √(x² + y²).']
      ],
      ex: String.raw`#include <stdio.h>
#include <math.h>

int main(void) {
    double a, b, c;                      /* solve a x^2 + b x + c = 0 */
    scanf("%lf %lf %lf", &a, &b, &c);
    double d = b * b - 4 * a * c;
    if (d < 0) printf("no real roots\n");
    else printf("x1 = %.3f, x2 = %.3f\n", (-b + sqrt(d)) / (2 * a), (-b - sqrt(d)) / (2 * a));
    double pi = acos(-1);
    printf("pi = %.6f, sin(pi/6) = %.2f, 2^10 = %.0f\n", pi, sin(pi / 6), pow(2, 10));
    printf("floor(-2.5) = %.0f, ceil(-2.5) = %.0f, round(2.5) = %.0f\n", floor(-2.5), ceil(-2.5), round(2.5));
    return 0;
}
`, input: '1 -3 2'
    },
    {
      h: 'ctype.h', about: 'Testing and converting single characters.',
      items: [
        ['isdigit(c)  isalpha(c)  isalnum(c)', 'Non-zero if c is a digit / a letter / a letter or digit.'],
        ['isspace(c)', 'Non-zero for space, tab and newline.'],
        ['isupper(c)  islower(c)', 'Non-zero for an upper-case / lower-case letter.'],
        ['toupper(c)  tolower(c)', 'The upper-case / lower-case version of a letter (other characters are unchanged).']
      ],
      ex: String.raw`#include <stdio.h>
#include <ctype.h>

int main(void) {
    int c, letters = 0, digits = 0, spaces = 0;
    while ((c = getchar()) != EOF) {
        if (isalpha(c)) letters++;
        else if (isdigit(c)) digits++;
        else if (isspace(c)) spaces++;
        putchar(toupper(c));
    }
    printf("\nletters %d, digits %d, spaces %d\n", letters, digits, spaces);
    return 0;
}
`, input: 'Room 42 is on floor 3'
    },
    {
      h: 'stdbool.h', about: 'The bool type with true and false (built into the language from C23).',
      items: [
        ['bool ok = true;', 'A variable that is true (1) or false (0).'],
        ['if (!ok) ...', 'Use it directly as a condition.']
      ],
      ex: String.raw`#include <stdio.h>
#include <stdbool.h>

bool is_prime(int n) {
    if (n < 2) return false;
    for (int d = 2; d * d <= n; d++)
        if (n % d == 0) return false;
    return true;
}

int main(void) {
    for (int i = 1; i <= 30; i++)
        if (is_prime(i)) printf("%d ", i);
    printf("\n");
    return 0;
}
`, input: ''
    },
    {
      h: 'limits.h', about: 'The smallest and largest values each integer type can hold.',
      items: [
        ['INT_MAX  INT_MIN', 'Largest and smallest int (2147483647 and −2147483648 here).'],
        ['LLONG_MAX  LLONG_MIN', 'Largest and smallest long long.'],
        ['UINT_MAX  CHAR_MAX  CHAR_BIT', 'Largest unsigned int, largest char, bits in a byte.']
      ],
      ex: String.raw`#include <stdio.h>
#include <limits.h>

int main(void) {
    int a[] = {7, -3, 12, 5};
    int best = INT_MIN;                  /* start below every possible value */
    for (int i = 0; i < 4; i++) if (a[i] > best) best = a[i];
    printf("max = %d\n", best);
    printf("int: %d to %d\n", INT_MIN, INT_MAX);
    printf("long long max: %lld\n", LLONG_MAX);
    return 0;
}
`, input: ''
    },
    {
      h: 'stdint.h', about: 'Integer types with an exact width.',
      items: [
        ['int8_t  int16_t  int32_t  int64_t', 'Signed integers of exactly 8, 16, 32 and 64 bits.'],
        ['uint8_t ... uint64_t', 'Unsigned versions (no negative values).'],
        ['INT32_MAX  UINT64_MAX', 'Their limits.']
      ],
      ex: String.raw`#include <stdio.h>
#include <stdint.h>

int main(void) {
    uint8_t small = 250;
    small += 10;                         /* wraps around past 255 */
    int64_t big = 1;
    for (int i = 0; i < 40; i++) big *= 2;
    printf("uint8_t 250 + 10 = %d\n", small);
    printf("2^40 = %lld\n", (long long)big);
    return 0;
}
`, input: ''
    },
    {
      h: 'time.h', about: 'The current time and how long code takes.',
      items: [
        ['time(NULL)', 'Seconds since 1 January 1970. Often used as srand(time(NULL)).'],
        ['clock()  CLOCKS_PER_SEC', 'Processor time used; divide a difference by CLOCKS_PER_SEC for seconds.']
      ],
      ex: String.raw`#include <stdio.h>
#include <stdlib.h>
#include <time.h>

int main(void) {
    srand(time(NULL));                   /* different dice every run */
    for (int i = 0; i < 5; i++) printf("%d ", rand() % 6 + 1);
    printf("\n");
    clock_t start = clock();
    volatile long long s = 0;
    for (long long i = 0; i < 50000000; i++) s += i;
    printf("loop took %.3f s\n", (double)(clock() - start) / CLOCKS_PER_SEC);
    return 0;
}
`, input: ''
    },
    {
      h: 'assert.h', about: 'Checking that something you believe is true really is.',
      items: [
        ['assert(condition);', 'If the condition is false, the program stops with a message naming the file and line.']
      ],
      ex: String.raw`#include <stdio.h>
#include <assert.h>

int divide(int a, int b) {
    assert(b != 0);                      /* try changing 4 to 0 below */
    return a / b;
}

int main(void) {
    printf("%d\n", divide(20, 4));
    return 0;
}
`, input: ''
    }
  ],
  cpp: [
    {
      h: 'bits/stdc++.h', about: 'Not a standard header: a shortcut that includes every standard header at once. Common in competitive programming; it makes compiling slower.',
      items: [
        ['#include <bits/stdc++.h>', 'Gives you iostream, vector, string, algorithm, map, set, queue, cmath and the rest in one line.'],
        ['using namespace std;', 'Usually written after it, so you can write cout instead of std::cout.'],
        ['__gcd(a, b)  __lg(n)', 'GCC extras: greatest common divisor and ⌊log₂ n⌋ (the playground provides them too).']
      ],
      ex: String.raw`#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    vector<long long> a(n);
    for (auto& x : a) cin >> x;
    sort(a.begin(), a.end());
    cout << "min " << a.front() << ", max " << a.back()
         << ", sum " << accumulate(a.begin(), a.end(), 0LL)
         << ", gcd " << __gcd(a[0], a[1]) << "\n";
    return 0;
}
`, input: '5\n12 18 30 42 6'
    },
    {
      h: 'iostream', about: 'Input and output with streams: cout prints, cin reads.',
      items: [
        ['cout << x << " " << y << "\\n";', 'Print values; chain them with <<.'],
        ['cin >> a >> b;', 'Read values separated by spaces or newlines.'],
        ['while (cin >> x) { ... }', 'Read until the input ends.'],
        ['endl', 'A newline that also flushes the output; "\\n" is faster.'],
        ['cerr << "message";', 'Print to the error stream (shown in red here).'],
        ['getline(cin, line);', 'Read a whole line with spaces (from <string>). After cin >> x, call cin.ignore() first to skip the leftover newline.'],
        ['ios::sync_with_stdio(false); cin.tie(nullptr);', 'Faster input and output for large data.']
      ],
      ex: String.raw`#include <iostream>
#include <string>
using namespace std;

int main() {
    string name;
    int age;
    cin >> name >> age;
    cin.ignore();                        // skip the rest of the line
    string city;
    getline(cin, city);                  // a whole line, spaces included
    cout << "Name: " << name << "\n"
         << "Age next year: " << age + 1 << "\n"
         << "City: " << city << endl;
    return 0;
}
`, input: 'Mazhar 21\nNew York City'
    },
    {
      h: 'iomanip', about: 'Formatting output: widths, decimals, fill characters.',
      items: [
        ['cout << fixed << setprecision(2) << x;', 'Show x with exactly 2 decimal places.'],
        ['setprecision(n)', 'Without fixed: n significant digits in total.'],
        ['setw(n)', 'Make the next value at least n characters wide (right-aligned). Applies to one value only.'],
        ['left  right', 'Alignment inside setw (from <iostream>).'],
        ['setfill(c)', 'The character used for padding, e.g. setfill(\'0\').']
      ],
      ex: String.raw`#include <iostream>
#include <iomanip>
using namespace std;

int main() {
    string items[] = {"pen", "notebook", "bag"};
    double price[] = {0.5, 2.25, 15};
    cout << fixed << setprecision(2);
    for (int i = 0; i < 3; i++)
        cout << left << setw(10) << items[i] << right << setw(8) << price[i] << "\n";
    cout << setfill('0') << setw(5) << 42 << "\n";   // 00042
    return 0;
}
`, input: ''
    },
    {
      h: 'string', about: 'The string class: text that knows its length and can grow.',
      items: [
        ['string s = "hello";  s.size()', 'Create a string; size() (or length()) is the number of characters.'],
        ['s + t   s += t   s == t   s < t', 'Join, append, compare (dictionary order).'],
        ['s[i]   s.back()', 'One character (char); the last character.'],
        ['s.substr(pos, len)', 'The part starting at pos, len characters long.'],
        ['s.find(t)', 'Position of the first t, or string::npos if not found.'],
        ['s.push_back(c)  s.pop_back()', 'Add / remove a character at the end.'],
        ['s.insert(pos, t)  s.erase(pos, len)', 'Insert text / remove len characters at pos.'],
        ['to_string(x)  stoi(s)  stoll(s)  stod(s)', 'Number to text, text to int / long long / double.'],
        ['getline(cin, s);', 'Read a whole line.']
      ],
      ex: String.raw`#include <iostream>
#include <string>
#include <algorithm>
using namespace std;

int main() {
    string s;
    getline(cin, s);
    cout << "length: " << s.size() << "\n";
    cout << "first word: " << s.substr(0, s.find(' ')) << "\n";
    size_t p = s.find("world");
    if (p != string::npos) s.replace(p, 5, "C++");
    cout << s << "\n";
    string r = s;
    reverse(r.begin(), r.end());
    cout << r << "\n";
    int n = stoi("41") + 1;
    cout << "answer: " + to_string(n) << "\n";
    return 0;
}
`, input: 'hello world from the playground'
    },
    {
      h: 'vector', about: 'A dynamic array: like an array, but it can grow and knows its size.',
      items: [
        ['vector<int> v;   vector<int> v(n, 0);', 'An empty vector / n elements all equal to 0.'],
        ['v.push_back(x)  v.pop_back()', 'Add an element at the end / remove the last one.'],
        ['v.size()  v.empty()', 'Number of elements; true if there are none.'],
        ['v[i]  v.front()  v.back()', 'Element i (from 0); the first and last element.'],
        ['for (int x : v)', 'Visit every element. Use int& x to change them.'],
        ['v.insert(v.begin() + i, x)  v.erase(v.begin() + i)', 'Insert / remove at position i (slow for large vectors).'],
        ['v.clear()  v.resize(n)', 'Remove everything / change the size.'],
        ['vector<vector<int>> g(n, vector<int>(m, 0));', 'A 2-D grid with n rows and m columns.'],
        ['v.begin()  v.end()', 'Iterators to pass to algorithms such as sort.']
      ],
      ex: String.raw`#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> v;
    int x;
    while (cin >> x) v.push_back(x);
    cout << "size " << v.size() << ", first " << v.front() << ", last " << v.back() << "\n";
    for (int& y : v) y *= 2;             // & lets the loop change the elements
    for (int y : v) cout << y << ' ';
    cout << "\n";

    int n = 3, m = 4;
    vector<vector<int>> grid(n, vector<int>(m, 0));
    for (int i = 0; i < n; i++)
        for (int j = 0; j < m; j++) grid[i][j] = i * j;
    for (auto& row : grid) {
        for (int c : row) cout << c << ' ';
        cout << "\n";
    }
    return 0;
}
`, input: '3 1 4 1 5 9 2 6'
    },
    {
      h: 'map', about: 'Key → value pairs kept sorted by key. Lookup, insert and erase take O(log n).',
      items: [
        ['map<string, int> m;', 'A map from strings to ints.'],
        ['m[key] = value;   m[key]++;', 'Set a value. m[key] creates the key with 0 if it is missing.'],
        ['m.count(key)   m.find(key) != m.end()', 'Check whether a key exists without creating it.'],
        ['m.erase(key);   m.size()', 'Remove a key; number of keys.'],
        ['for (auto& [k, v] : m)', 'Visit the pairs in increasing key order (C++17).'],
        ['m.lower_bound(k)', 'The first key that is ≥ k.'],
        ['multimap<K, V>', 'Allows the same key more than once.']
      ],
      ex: String.raw`#include <iostream>
#include <map>
#include <string>
using namespace std;

int main() {
    map<string, int> count;
    string w;
    while (cin >> w) count[w]++;
    for (auto& [word, c] : count)        // sorted by word
        cout << word << ": " << c << "\n";
    cout << (count.count("dog") ? "has dog" : "no dog") << "\n";
    return 0;
}
`, input: 'the cat and the dog and the bird'
    },
    {
      h: 'unordered_map', about: 'Key → value pairs in a hash table: O(1) on average, but in no particular order.',
      items: [
        ['unordered_map<int, int> m;', 'Same operations as map: m[k], count, find, erase, size.'],
        ['for (auto& [k, v] : m)', 'Visits the pairs in an unspecified order.'],
        ['unordered_set<int> s;', 'The set version (in <unordered_set>).']
      ],
      ex: String.raw`#include <iostream>
#include <unordered_map>
#include <vector>
using namespace std;

int main() {
    // two-sum: find two numbers that add up to the target
    vector<int> a{2, 7, 11, 15};
    int target = 18;
    unordered_map<int, int> seen;        // value -> index
    for (int i = 0; i < (int)a.size(); i++) {
        if (seen.count(target - a[i])) {
            cout << "a[" << seen[target - a[i]] << "] + a[" << i << "] = " << target << "\n";
            break;
        }
        seen[a[i]] = i;
    }
    return 0;
}
`, input: ''
    },
    {
      h: 'set', about: 'Unique values kept in sorted order. Insert, erase and search take O(log n).',
      items: [
        ['set<int> s;   s.insert(x);', 'Add x (ignored if it is already there).'],
        ['s.count(x)   s.erase(x)', '1 if x is in the set, else 0; remove x.'],
        ['*s.begin()   *s.rbegin()', 'Smallest and largest value.'],
        ['s.lower_bound(x)', 'The first value ≥ x.'],
        ['multiset<int> ms;', 'Allows repeated values; ms.erase(ms.find(x)) removes one copy.']
      ],
      ex: String.raw`#include <iostream>
#include <set>
using namespace std;

int main() {
    set<int> s;
    int x;
    while (cin >> x) s.insert(x);        // duplicates are dropped
    cout << s.size() << " distinct:";
    for (int y : s) cout << ' ' << y;
    cout << "\nsmallest " << *s.begin() << ", largest " << *s.rbegin() << "\n";
    cout << "first value >= 6: " << *s.lower_bound(6) << "\n";
    return 0;
}
`, input: '5 3 8 3 1 8 6 5'
    },
    {
      h: 'queue', about: 'queue (first in, first out) and priority_queue (largest out first).',
      items: [
        ['queue<int> q;  q.push(x);', 'Add to the back.'],
        ['q.front()  q.pop()', 'Look at / remove the front element.'],
        ['q.empty()  q.size()', 'Is it empty; how many elements.'],
        ['priority_queue<int> pq;  pq.top()', 'pq.top() is always the largest element.'],
        ['priority_queue<int, vector<int>, greater<int>> pq;', 'Smallest on top instead (a min-heap).']
      ],
      ex: String.raw`#include <iostream>
#include <queue>
#include <vector>
using namespace std;

int main() {
    queue<string> line;
    line.push("Ana"); line.push("Ben"); line.push("Chen");
    while (!line.empty()) {
        cout << "serving " << line.front() << "\n";
        line.pop();
    }
    priority_queue<int> maxq;
    priority_queue<int, vector<int>, greater<int>> minq;
    for (int x : {5, 1, 8, 3}) { maxq.push(x); minq.push(x); }
    cout << "largest " << maxq.top() << ", smallest " << minq.top() << "\n";
    return 0;
}
`, input: ''
    },
    {
      h: 'stack', about: 'Last in, first out.',
      items: [
        ['stack<int> st;  st.push(x);', 'Put x on top.'],
        ['st.top()  st.pop()', 'Look at / remove the top element.'],
        ['st.empty()  st.size()', 'Is it empty; how many elements.']
      ],
      ex: String.raw`#include <iostream>
#include <stack>
#include <string>
using namespace std;

bool balanced(const string& s) {
    stack<char> st;
    for (char c : s) {
        if (c == '(' || c == '[' || c == '{') st.push(c);
        else if (c == ')' || c == ']' || c == '}') {
            if (st.empty()) return false;
            char o = st.top(); st.pop();
            if ((o == '(') != (c == ')') || (o == '[') != (c == ']')) return false;
        }
    }
    return st.empty();
}

int main() {
    string s;
    while (cin >> s) cout << s << (balanced(s) ? "  balanced\n" : "  not balanced\n");
    return 0;
}
`, input: '([]{}) ([)] (('
    },
    {
      h: 'deque', about: 'A double-ended queue: fast adding and removing at both ends, plus d[i].',
      items: [
        ['deque<int> d;', 'Create one.'],
        ['d.push_front(x)  d.push_back(x)', 'Add at the front / back.'],
        ['d.pop_front()  d.pop_back()', 'Remove from the front / back.'],
        ['d.front()  d.back()  d[i]', 'Access elements.']
      ],
      ex: String.raw`#include <iostream>
#include <deque>
using namespace std;

int main() {
    deque<int> d;
    d.push_back(2); d.push_back(3); d.push_front(1); d.push_front(0);
    for (int x : d) cout << x << ' ';
    d.pop_front(); d.pop_back();
    cout << "\nafter popping both ends: " << d.front() << ' ' << d.back() << "\n";
    return 0;
}
`, input: ''
    },
    {
      h: 'algorithm', about: 'Ready-made algorithms that work on ranges such as v.begin(), v.end().',
      items: [
        ['sort(v.begin(), v.end());', 'Sort in increasing order (O(n log n)). Works on arrays too: sort(a, a + n).'],
        ['sort(v.begin(), v.end(), greater<int>());', 'Sort in decreasing order.'],
        ['sort(v.begin(), v.end(), [](auto& a, auto& b) { return a.second < b.second; });', 'Sort with your own rule (a lambda that says when a comes before b).'],
        ['reverse(v.begin(), v.end());', 'Reverse the order.'],
        ['max(a, b)  min(a, b)  max({a, b, c})', 'Larger / smaller of values of the same type.'],
        ['swap(a, b);', 'Exchange two values.'],
        ['*max_element(v.begin(), v.end())', 'The largest element (min_element for the smallest).'],
        ['find(v.begin(), v.end(), x)', 'Iterator to the first x, or v.end() if absent.'],
        ['count(v.begin(), v.end(), x)', 'How many times x appears (count_if with a condition).'],
        ['binary_search(v.begin(), v.end(), x)', 'Is x in the sorted range? (O(log n)).'],
        ['lower_bound(v.begin(), v.end(), x)', 'In a sorted range, the first element ≥ x (upper_bound: > x).'],
        ['v.erase(unique(v.begin(), v.end()), v.end());', 'Remove repeated neighbours (sort first to remove all duplicates).'],
        ['next_permutation(v.begin(), v.end())', 'Change v to the next arrangement; false after the last one.']
      ],
      ex: String.raw`#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    vector<int> v{5, 3, 8, 3, 1, 9, 5};
    sort(v.begin(), v.end());
    for (int x : v) cout << x << ' ';
    cout << "\nmax " << *max_element(v.begin(), v.end())
         << ", count of 3: " << count(v.begin(), v.end(), 3)
         << ", has 8: " << binary_search(v.begin(), v.end(), 8) << "\n";
    auto it = lower_bound(v.begin(), v.end(), 4);
    cout << "first >= 4 is " << *it << " at index " << (it - v.begin()) << "\n";
    v.erase(unique(v.begin(), v.end()), v.end());
    sort(v.begin(), v.end(), greater<int>());
    for (int x : v) cout << x << ' ';
    cout << "\n";
    string s = "abc";
    do cout << s << ' '; while (next_permutation(s.begin(), s.end()));
    cout << "\n";
    return 0;
}
`, input: ''
    },
    {
      h: 'numeric', about: 'Numeric algorithms on ranges.',
      items: [
        ['accumulate(v.begin(), v.end(), 0LL)', 'Sum of the elements; the type of the start value (0LL = long long) is the type of the sum.'],
        ['iota(v.begin(), v.end(), 1);', 'Fill with 1, 2, 3, …'],
        ['partial_sum(a.begin(), a.end(), p.begin());', 'Prefix sums: p[i] = a[0] + … + a[i].'],
        ['gcd(a, b)  lcm(a, b)', 'Greatest common divisor and least common multiple (C++17).']
      ],
      ex: String.raw`#include <iostream>
#include <numeric>
#include <vector>
using namespace std;

int main() {
    vector<int> v(10);
    iota(v.begin(), v.end(), 1);         // 1..10
    cout << "sum " << accumulate(v.begin(), v.end(), 0LL) << "\n";
    vector<int> p(v.size());
    partial_sum(v.begin(), v.end(), p.begin());
    for (int x : p) cout << x << ' ';
    cout << "\ngcd(84, 36) = " << gcd(84, 36) << ", lcm(4, 6) = " << lcm(4, 6) << "\n";
    return 0;
}
`, input: ''
    },
    {
      h: 'utility', about: 'pair: two values kept together.',
      items: [
        ['pair<string, int> p = {"Ana", 90};', 'A pair of a string and an int.'],
        ['p.first  p.second', 'The two parts.'],
        ['make_pair(a, b)', 'Make a pair without writing the types.'],
        ['auto [name, mark] = p;', 'Unpack it into two variables (C++17).'],
        ['p < q', 'Pairs compare by first, then by second, so sort works on them.']
      ],
      ex: String.raw`#include <iostream>
#include <utility>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    vector<pair<int, string>> marks{{72, "Rahim"}, {91, "Ayesha"}, {85, "Karim"}};
    sort(marks.begin(), marks.end());              // by mark, then by name
    for (auto& [mark, name] : marks) cout << name << ' ' << mark << "\n";
    pair<int, int> p = make_pair(3, 4);
    swap(p.first, p.second);
    cout << p.first << ", " << p.second << "\n";
    return 0;
}
`, input: ''
    },
    {
      h: 'cmath', about: 'The C math functions for C++ (same names as math.h).',
      items: [
        ['sqrt(x)  pow(x, y)  cbrt(x)', 'Square root, power, cube root.'],
        ['abs(x)', 'Absolute value; works for int and double in C++.'],
        ['floor(x)  ceil(x)  round(x)', 'Rounding.'],
        ['sin(x)  cos(x)  atan2(y, x)  acos(-1)', 'Trigonometry in radians; acos(-1) is π.'],
        ['exp(x)  log(x)  log2(x)  log10(x)', 'Exponential and logarithms.'],
        ['hypot(x, y)', '√(x² + y²), the length of a vector.']
      ],
      ex: String.raw`#include <iostream>
#include <cmath>
using namespace std;

int main() {
    double x1, y1, x2, y2;
    cin >> x1 >> y1 >> x2 >> y2;
    cout << "distance: " << hypot(x2 - x1, y2 - y1) << "\n";
    cout << "angle: " << atan2(y2 - y1, x2 - x1) * 180 / acos(-1) << " degrees\n";
    cout << "abs(-3) = " << abs(-3) << ", pow(2, 0.5) = " << pow(2, 0.5) << "\n";
    return 0;
}
`, input: '0 0 3 4'
    },
    {
      h: 'sstream', about: 'Streams that read from or write to a string.',
      items: [
        ['stringstream ss(line);  ss >> x;', 'Read values out of a string, like cin.'],
        ['while (ss >> word)', 'Split a line into words.'],
        ['ostringstream os;  os << x;  os.str()', 'Build a string with <<, then take it out with str().']
      ],
      ex: String.raw`#include <iostream>
#include <sstream>
#include <string>
using namespace std;

int main() {
    string line;
    while (getline(cin, line)) {
        stringstream ss(line);
        int x, sum = 0, n = 0;
        while (ss >> x) { sum += x; n++; }
        ostringstream os;
        os << n << " numbers, sum " << sum;
        cout << os.str() << "\n";
    }
    return 0;
}
`, input: '1 2 3\n10 20\n7'
    },
    {
      h: 'functional', about: 'Function objects: storing functions in variables, and comparison helpers.',
      items: [
        ['function<int(int, int)> f = ...;', 'A variable that holds any function taking two ints and returning an int.'],
        ['[](int a, int b) { return a + b; }', 'A lambda: a function written inline. [&] lets it use outside variables.'],
        ['greater<int>()  less<int>()', 'Ready-made comparisons, e.g. for sort or priority_queue.']
      ],
      ex: String.raw`#include <iostream>
#include <functional>
using namespace std;

int main() {
    int factor = 3;
    function<int(int)> times = [&](int x) { return x * factor; };
    function<long long(int)> fact = [&](int n) { return n <= 1 ? 1LL : n * fact(n - 1); };
    cout << times(5) << " " << fact(10) << "\n";
    cout << greater<int>()(5, 2) << "\n";   // 1: 5 > 2
    return 0;
}
`, input: ''
    },
    {
      h: 'memory', about: 'Smart pointers that free their memory automatically.',
      items: [
        ['auto p = make_unique<T>(args);', 'A unique_ptr: the only owner of a new T. Freed when p goes out of scope.'],
        ['auto p = make_shared<T>(args);', 'A shared_ptr: many owners; freed when the last one is gone.'],
        ['p->member  *p', 'Use it like an ordinary pointer.']
      ],
      ex: String.raw`#include <iostream>
#include <memory>
#include <string>
using namespace std;

struct Node {
    string name;
    Node(string n) : name(n) { cout << "create " << name << "\n"; }
    ~Node() { cout << "delete " << name << "\n"; }
};

int main() {
    auto a = make_unique<Node>("A");
    {
        auto b = make_shared<Node>("B");
        auto c = b;                      // two owners of B
        cout << "owners of B: " << b.use_count() << "\n";
    }                                    // B is deleted here
    cout << "end of main\n";
    return 0;                            // A is deleted here
}
`, input: ''
    },
    {
      h: 'climits', about: 'Limits of the integer types (same as limits.h). <limits> has numeric_limits.',
      items: [
        ['INT_MAX  INT_MIN  LLONG_MAX', 'Largest / smallest int and largest long long.'],
        ['numeric_limits<int>::max()', 'The same idea for any type (from <limits>).']
      ],
      ex: String.raw`#include <iostream>
#include <climits>
#include <limits>
using namespace std;

int main() {
    cout << INT_MAX << " " << INT_MIN << "\n";
    cout << LLONG_MAX << "\n";
    cout << numeric_limits<double>::max() << "\n";
    return 0;
}
`, input: ''
    }
  ]
};
