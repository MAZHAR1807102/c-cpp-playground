// More C++ examples for the Example menu: [group, name, code, input]. Same programs and output as examples-c.js.
window.MORE_EXAMPLES = window.MORE_EXAMPLES || {};
MORE_EXAMPLES.cpp = [
['Classic programs', 'Fibonacci series', String.raw`#include <iostream>
using namespace std;

// recursive definition: F(0) = 0, F(1) = 1, F(n) = F(n-1) + F(n-2)
long long fib(int n) {
    if (n < 2) return n;
    return fib(n - 1) + fib(n - 2);
}

int main() {
    int n;
    cin >> n;
    long long a = 0, b = 1;
    cout << "First " << n << " Fibonacci numbers:\n";
    for (int i = 0; i < n; i++) {
        cout << a << " ";
        long long next = a + b;
        a = b;
        b = next;
    }
    cout << "\nTerm " << n << " by recursion: " << fib(n) << "\n";
    return 0;
}
`, '10'],
['Classic programs', 'Palindrome number', String.raw`#include <iostream>
using namespace std;

int main() {
    long long n;
    cin >> n;
    long long original = n, reversed = 0;
    while (n > 0) {
        reversed = reversed * 10 + n % 10;   // append the last digit
        n /= 10;                             // drop the last digit
    }
    cout << "Reversed: " << reversed << "\n";
    if (original == reversed) cout << original << " is a palindrome\n";
    else cout << original << " is not a palindrome\n";
    return 0;
}
`, '12321'],
['Classic programs', 'Palindrome string', String.raw`#include <iostream>
#include <string>
#include <cctype>
using namespace std;

int main() {
    string s;
    cin >> s;
    bool ok = true;
    for (int i = 0, j = (int)s.size() - 1; i < j; i++, j--) {   // compare from both ends, ignoring case
        if (tolower((unsigned char)s[i]) != tolower((unsigned char)s[j])) {
            ok = false;
            break;
        }
    }
    cout << s << (ok ? " is a palindrome" : " is not a palindrome") << "\n";
    return 0;
}
`, 'Madam'],
['Classic programs', 'Prime number check', String.raw`#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;
    bool prime = n >= 2;
    for (int d = 2; d * d <= n; d++) {        // a divisor larger than sqrt(n) has a partner smaller than it
        if (n % d == 0) {
            cout << n << " is divisible by " << d << "\n";
            prime = false;
            break;
        }
    }
    cout << n << (prime ? " is a prime number" : " is not a prime number") << "\n";
    return 0;
}
`, '97'],
['Classic programs', 'Primes up to N (sieve)', String.raw`#include <iostream>
#include <vector>
using namespace std;

// Sieve of Eratosthenes: cross out the multiples of every prime
int main() {
    int n;
    cin >> n;
    vector<bool> crossed(n + 1, false);
    int count = 0;
    cout << "Primes up to " << n << ":\n";
    for (int i = 2; i <= n; i++) {
        if (crossed[i]) continue;
        cout << i << " ";
        count++;
        for (long long j = (long long)i * i; j <= n; j += i) crossed[j] = true;
    }
    cout << "\nCount: " << count << "\n";
    return 0;
}
`, '50'],
['Classic programs', 'Reverse a number', String.raw`#include <iostream>
using namespace std;

int main() {
    long long n;
    cin >> n;
    long long reversed = 0;
    while (n > 0) {
        int digit = n % 10;
        reversed = reversed * 10 + digit;
        n /= 10;
        cout << "digit " << digit << " -> reversed = " << reversed << ", left = " << n << "\n";
    }
    cout << "Reversed number: " << reversed << "\n";
    return 0;
}
`, '12345'],
['Classic programs', 'Count digits', String.raw`#include <iostream>
using namespace std;

int main() {
    long long n;
    cin >> n;
    long long m = n < 0 ? -n : n;
    int count = 0;
    do {                       // do-while, so that 0 counts as one digit
        count++;
        m /= 10;
    } while (m > 0);
    cout << n << " has " << count << " digit" << (count == 1 ? "" : "s") << "\n";
    // shortcut: to_string(m).size() gives the same count for a non-negative number
    return 0;
}
`, '908070'],
['Classic programs', 'Sum of digits', String.raw`#include <iostream>
using namespace std;

int main() {
    long long n;
    cin >> n;
    long long m = n;
    int sum = 0;
    while (m > 0) {
        sum += m % 10;
        m /= 10;
    }
    cout << "Sum of digits of " << n << " = " << sum << "\n";
    return 0;
}
`, '4721'],
['Classic programs', 'Armstrong number', String.raw`#include <iostream>
using namespace std;

// an Armstrong number equals the sum of its digits, each raised to the number of digits: 153 = 1^3 + 5^3 + 3^3
long long power(int base, int exp) {
    long long r = 1;
    while (exp-- > 0) r *= base;
    return r;
}

int countDigits(int n) {
    int c = 0;
    do { c++; n /= 10; } while (n > 0);
    return c;
}

bool isArmstrong(int n) {
    int k = countDigits(n), m = n;
    long long sum = 0;
    while (m > 0) {
        sum += power(m % 10, k);
        m /= 10;
    }
    return sum == n;
}

int main() {
    int n;
    cin >> n;
    cout << n << (isArmstrong(n) ? " is an Armstrong number" : " is not an Armstrong number") << "\n";
    cout << "Armstrong numbers up to 1000: ";
    for (int i = 1; i <= 1000; i++)
        if (isArmstrong(i)) cout << i << " ";
    cout << "\n";
    return 0;
}
`, '153'],
['Classic programs', 'Factorial', String.raw`#include <iostream>
using namespace std;

long long factorial(int n) {          // recursion: n! = n * (n-1)!
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

int main() {
    int n;
    cin >> n;                         // long long holds factorials up to 20!
    long long f = 1;
    for (int i = 2; i <= n; i++) f *= i;
    cout << n << "! = " << f << " (loop)\n";
    cout << n << "! = " << factorial(n) << " (recursion)\n";
    return 0;
}
`, '10'],
['Classic programs', 'GCD and LCM', String.raw`#include <iostream>
#include <numeric>
using namespace std;

int main() {
    long long a, b;
    cin >> a >> b;
    long long x = a, y = b;
    while (y != 0) {                  // Euclid: gcd(x, y) = gcd(y, x % y)
        cout << "gcd(" << x << ", " << y << ")\n";
        long long r = x % y;
        x = y;
        y = r;
    }
    cout << "GCD = " << x << "\n";
    cout << "LCM = " << a / x * b << "\n";   // C++17 also has std::gcd(a, b) and std::lcm(a, b)
    return 0;
}
`, '12 18'],
['Classic programs', 'Perfect number', String.raw`#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;
    int sum = 0;
    cout << "Divisors of " << n << ": ";
    for (int d = 1; d < n; d++) {
        if (n % d == 0) {
            cout << d << " ";
            sum += d;
        }
    }
    cout << "\nSum = " << sum << "\n";
    cout << n << (sum == n ? " is a perfect number" : " is not a perfect number") << "\n";
    return 0;
}
`, '28'],
['Classic programs', 'Leap year', String.raw`#include <iostream>
using namespace std;

int main() {
    int y;
    cin >> y;
    // divisible by 4, except centuries, which must be divisible by 400
    bool leap = (y % 4 == 0 && y % 100 != 0) || y % 400 == 0;
    cout << y << (leap ? " is a leap year" : " is not a leap year") << "\n";
    return 0;
}
`, '2024'],
['Classic programs', 'Swap two numbers', String.raw`#include <iostream>
#include <utility>
using namespace std;

int main() {
    int a, b;
    cin >> a >> b;
    cout << "Before: a = " << a << ", b = " << b << "\n";
    int t = a;                 // with a third variable
    a = b;
    b = t;
    cout << "After swapping with a third variable: a = " << a << ", b = " << b << "\n";
    swap(a, b);                // the standard library's std::swap
    cout << "After swapping back without one: a = " << a << ", b = " << b << "\n";
    return 0;
}
`, '5 9'],

['Number conversions', 'Decimal to binary, octal, hex', String.raw`#include <iostream>
#include <string>
#include <algorithm>
using namespace std;

// repeated division: the remainders, read from last to first, are the digits
string toBase(long long n, int base) {
    const string digits = "0123456789ABCDEF";
    if (n == 0) return "0";
    string s;
    while (n > 0) {
        s += digits[n % base];
        n /= base;
    }
    reverse(s.begin(), s.end());
    return s;
}

int main() {
    long long n;
    cin >> n;
    cout << "Dividing by 2:\n";
    for (long long m = n; m > 0; m /= 2)
        cout << m << " / 2 = " << m / 2 << " remainder " << m % 2 << "\n";
    cout << "Binary: " << toBase(n, 2) << "\n";
    cout << "Octal: " << toBase(n, 8) << "\n";
    cout << "Hexadecimal: " << toBase(n, 16) << "\n";
    cout << "Check: octal " << oct << n << ", hex " << uppercase << hex << n << dec << "\n";
    return 0;
}
`, '156'],
['Number conversions', 'Binary to decimal', String.raw`#include <iostream>
#include <string>
using namespace std;

int main() {
    string s;
    cin >> s;
    long long value = 0;
    for (char c : s) {
        if (c != '0' && c != '1') {
            cout << "'" << c << "' is not a binary digit\n";
            return 1;
        }
        value = value * 2 + (c - '0');    // shift left by one place and add the new digit
        cout << "after '" << c << "': " << value << "\n";
    }
    cout << s << " in decimal = " << value << "\n";   // stoll(s, nullptr, 2) does the same
    return 0;
}
`, '101101'],
['Number conversions', 'Any base to any base', String.raw`#include <iostream>
#include <string>
#include <cctype>
#include <algorithm>
using namespace std;

int digitValue(char c) {
    if (isdigit((unsigned char)c)) return c - '0';
    c = (char)toupper((unsigned char)c);
    if (c >= 'A' && c <= 'Z') return c - 'A' + 10;
    return 99;
}

int main() {
    string s;
    int from, to;
    cin >> s >> from >> to;           // number, its base, the base to convert to (2 to 36)
    long long value = 0;
    for (char c : s) {
        int d = digitValue(c);
        if (d >= from) {
            cout << "'" << c << "' is not a digit in base " << from << "\n";
            return 1;
        }
        value = value * from + d;
    }
    const string digits = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    string out;
    long long m = value;
    if (m == 0) out = "0";
    while (m > 0) {
        out += digits[m % to];
        m /= to;
    }
    reverse(out.begin(), out.end());
    cout << s << " (base " << from << ") = " << value << " (base 10) = " << out << " (base " << to << ")\n";
    return 0;
}
`, 'FF 16 2'],

['Patterns', 'Right triangle', String.raw`#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= i; j++) cout << "* ";
        cout << "\n";
    }
    return 0;
}
`, '5'],
['Patterns', 'Inverted triangle', String.raw`#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;
    for (int i = n; i >= 1; i--) {
        for (int j = 1; j <= i; j++) cout << "* ";
        cout << "\n";
    }
    return 0;
}
`, '5'],
['Patterns', 'Pyramid', String.raw`#include <iostream>
#include <string>
using namespace std;

int main() {
    int n;
    cin >> n;
    for (int i = 1; i <= n; i++)
        cout << string(n - i, ' ') << string(2 * i - 1, '*') << "\n";   // n - i spaces, 2i - 1 stars
    return 0;
}
`, '5'],
['Patterns', 'Diamond', String.raw`#include <iostream>
#include <string>
using namespace std;

void row(int n, int i) { cout << string(n - i, ' ') << string(2 * i - 1, '*') << "\n"; }

int main() {
    int n;
    cin >> n;
    for (int i = 1; i <= n; i++) row(n, i);        // top half
    for (int i = n - 1; i >= 1; i--) row(n, i);    // bottom half
    return 0;
}
`, '5'],
['Patterns', "Floyd's triangle", String.raw`#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;
    int k = 1;
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= i; j++) cout << k++ << " ";
        cout << "\n";
    }
    return 0;
}
`, '5'],
['Patterns', "Pascal's triangle", String.raw`#include <iostream>
#include <string>
using namespace std;

int main() {
    int n;
    cin >> n;
    for (int i = 0; i < n; i++) {
        cout << string(n - i - 1, ' ');
        long long c = 1;                           // C(i, 0)
        for (int j = 0; j <= i; j++) {
            cout << c << " ";
            c = c * (i - j) / (j + 1);             // C(i, j+1) from C(i, j)
        }
        cout << "\n";
    }
    return 0;
}
`, '5'],
['Patterns', 'Hollow square', String.raw`#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            bool edge = i == 0 || i == n - 1 || j == 0 || j == n - 1;
            cout << (edge ? "* " : "  ");
        }
        cout << "\n";
    }
    return 0;
}
`, '5'],

['Arrays', 'Max, min, sum, average', String.raw`#include <iostream>
#include <iomanip>
#include <vector>
#include <algorithm>
#include <numeric>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> a(n);
    for (int &x : a) cin >> x;
    long long sum = accumulate(a.begin(), a.end(), 0LL);
    cout << "Max: " << *max_element(a.begin(), a.end()) << "\n";
    cout << "Min: " << *min_element(a.begin(), a.end()) << "\n";
    cout << "Sum: " << sum << "\n";
    cout << "Average: " << fixed << setprecision(2) << (double)sum / n << "\n";
    return 0;
}
`, '6\n4 8 15 16 23 42'],
['Arrays', 'Reverse an array', String.raw`#include <iostream>
#include <vector>
#include <utility>
using namespace std;

void print(const char *label, const vector<int> &a) {
    cout << label;
    for (int x : a) cout << x << " ";
    cout << "\n";
}

int main() {
    int n;
    cin >> n;
    vector<int> a(n);
    for (int &x : a) cin >> x;
    print("Original: ", a);
    for (int i = 0, j = n - 1; i < j; i++, j--) swap(a[i], a[j]);   // or: reverse(a.begin(), a.end())
    print("Reversed: ", a);
    return 0;
}
`, '5\n1 2 3 4 5'],
['Arrays', 'Second largest', String.raw`#include <iostream>
#include <vector>
#include <climits>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> a(n);
    for (int &x : a) cin >> x;
    int first = INT_MIN, second = INT_MIN;
    for (int x : a) {
        if (x > first) {
            second = first;
            first = x;
        } else if (x > second && x != first) {
            second = x;
        }
    }
    cout << "Largest: " << first << "\n";
    if (second == INT_MIN) cout << "There is no second largest (all values are equal)\n";
    else cout << "Second largest: " << second << "\n";
    return 0;
}
`, '7\n12 35 1 10 34 1 35'],
['Arrays', 'Linear search', String.raw`#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n, key;
    cin >> n;
    vector<int> a(n);
    for (int &x : a) cin >> x;
    cin >> key;
    int first = -1, count = 0;
    for (int i = 0; i < n; i++) {
        if (a[i] == key) {
            if (first < 0) first = i;
            count++;
        }
    }
    if (first < 0) cout << key << " not found\n";
    else {
        cout << key << " found at index " << first << "\n";
        cout << key << " appears " << count << " time" << (count == 1 ? "" : "s") << "\n";
    }
    return 0;
}
`, '6\n7 3 9 2 9 5\n9'],
['Arrays', 'Insert and delete', String.raw`#include <iostream>
#include <vector>
using namespace std;

void print(const vector<int> &a) {
    for (int x : a) cout << x << " ";
    cout << "\n";
}

int main() {
    int n, pos, value, del;
    cin >> n;
    vector<int> a(n);
    for (int &x : a) cin >> x;
    cin >> pos >> value >> del;       // insert value at index pos, then delete index del
    cout << "Array: ";
    print(a);
    if (pos < 0 || pos > (int)a.size()) { cout << "Invalid position\n"; return 1; }
    a.insert(a.begin() + pos, value);  // vector shifts the elements for us
    cout << "After inserting " << value << " at index " << pos << ": ";
    print(a);
    if (del < 0 || del >= (int)a.size()) { cout << "Invalid position\n"; return 1; }
    a.erase(a.begin() + del);
    cout << "After deleting index " << del << ": ";
    print(a);
    return 0;
}
`, '5\n10 20 30 40 50\n2 25\n4'],
['Arrays', 'Rotate by k', String.raw`#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

void print(const vector<int> &a) {
    for (int x : a) cout << x << " ";
    cout << "\n";
}

int main() {
    int n, k;
    cin >> n;
    vector<int> a(n);
    for (int &x : a) cin >> x;
    cin >> k;
    k %= n;
    vector<int> b = a;
    rotate(b.begin(), b.begin() + k, b.end());          // left: element k comes first
    cout << "Rotated left by " << k << ": ";
    print(b);
    b = a;
    rotate(b.begin(), b.end() - k, b.end());            // right: the last k come first
    cout << "Rotated right by " << k << ": ";
    print(b);
    return 0;
}
`, '7\n1 2 3 4 5 6 7\n3'],
['Arrays', 'Remove duplicates (sorted)', String.raw`#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> a(n);
    for (int &x : a) cin >> x;
    a.erase(unique(a.begin(), a.end()), a.end());   // unique moves the kept values to the front
    cout << "After removing duplicates: ";
    for (int x : a) cout << x << " ";
    cout << "\nNew length: " << a.size() << "\n";
    return 0;
}
`, '9\n1 1 2 2 2 3 4 4 5'],
['Arrays', 'Frequency of each element', String.raw`#include <iostream>
#include <vector>
#include <map>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> a(n);
    for (int &x : a) cin >> x;
    map<int, int> count;              // value -> how many times
    vector<int> order;                // values in the order they first appear
    for (int x : a)
        if (count[x]++ == 0) order.push_back(x);
    for (int x : order)
        cout << x << " occurs " << count[x] << " time" << (count[x] == 1 ? "" : "s") << "\n";
    return 0;
}
`, '10\n3 1 3 2 1 3 4 2 3 1'],
['Arrays', 'Matrix add, multiply, transpose', String.raw`#include <iostream>
#include <iomanip>
#include <vector>
using namespace std;

typedef vector<vector<int>> Matrix;

void show(const char *title, const Matrix &M) {
    cout << title << "\n";
    for (auto &row : M) {
        for (int x : row) cout << setw(4) << x;
        cout << "\n";
    }
}

int main() {
    int n;
    cin >> n;
    Matrix A(n, vector<int>(n)), B = A, C = A;
    for (auto &row : A) for (int &x : row) cin >> x;
    for (auto &row : B) for (int &x : row) cin >> x;
    for (int i = 0; i < n; i++) for (int j = 0; j < n; j++) C[i][j] = A[i][j] + B[i][j];
    show("A + B:", C);
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++) {
            C[i][j] = 0;
            for (int k = 0; k < n; k++) C[i][j] += A[i][k] * B[k][j];   // row i of A times column j of B
        }
    show("A x B:", C);
    for (int i = 0; i < n; i++) for (int j = 0; j < n; j++) C[j][i] = A[i][j];
    show("Transpose of A:", C);
    return 0;
}
`, '2\n1 2\n3 4\n5 6\n7 8'],

['Algorithms, step by step', 'Bubble sort', String.raw`#include <iostream>
#include <vector>
#include <utility>
using namespace std;

void print(const vector<int> &a) { for (int x : a) cout << x << " "; }

int main() {
    int n;
    cin >> n;
    vector<int> a(n);
    for (int &x : a) cin >> x;
    cout << "Start: ";
    print(a);
    cout << "\n";
    for (int pass = 1; pass < n; pass++) {
        int swaps = 0;
        for (int j = 0; j < n - pass; j++) {   // the largest value bubbles to the end
            if (a[j] > a[j + 1]) {
                swap(a[j], a[j + 1]);
                swaps++;
            }
        }
        cout << "Pass " << pass << ": ";
        print(a);
        cout << "(swaps: " << swaps << ")\n";
        if (swaps == 0) {
            cout << "No swaps, so the array is sorted.\n";
            break;
        }
    }
    cout << "Sorted: ";
    print(a);
    cout << "\n";
    return 0;
}
`, '6\n5 1 4 2 8 0'],
['Algorithms, step by step', 'Selection sort', String.raw`#include <iostream>
#include <vector>
#include <utility>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> a(n);
    for (int &x : a) cin >> x;
    for (int i = 0; i < n - 1; i++) {
        int m = i;                              // index of the smallest value in a[i..n-1]
        for (int j = i + 1; j < n; j++)
            if (a[j] < a[m]) m = j;
        swap(a[i], a[m]);
        cout << "Step " << i + 1 << ": smallest of the rest is " << a[i] << ", put at index " << i << " -> ";
        for (int x : a) cout << x << " ";
        cout << "\n";
    }
    return 0;
}
`, '6\n64 25 12 22 11 90'],
['Algorithms, step by step', 'Insertion sort', String.raw`#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> a(n);
    for (int &x : a) cin >> x;
    for (int i = 1; i < n; i++) {
        int key = a[i], j = i - 1;
        while (j >= 0 && a[j] > key) {        // shift bigger values one place right
            a[j + 1] = a[j];
            j--;
        }
        a[j + 1] = key;
        cout << "Insert " << key << " -> ";
        for (int x : a) cout << x << " ";
        cout << "\n";
    }
    return 0;
}
`, '6\n12 11 13 5 6 7'],
['Algorithms, step by step', 'Merge sort', String.raw`#include <iostream>
#include <vector>
using namespace std;

vector<int> a;

void merge(int l, int m, int r) {
    vector<int> tmp;
    int i = l, j = m + 1;
    while (i <= m && j <= r) tmp.push_back(a[i] <= a[j] ? a[i++] : a[j++]);
    while (i <= m) tmp.push_back(a[i++]);
    while (j <= r) tmp.push_back(a[j++]);
    for (int t = 0; t < (int)tmp.size(); t++) a[l + t] = tmp[t];
    cout << "Merge [" << l << ".." << m << "] + [" << m + 1 << ".." << r << "] -> ";
    for (int t = l; t <= r; t++) cout << a[t] << " ";
    cout << "\n";
}

void mergeSort(int l, int r) {
    if (l >= r) return;
    int m = (l + r) / 2;
    mergeSort(l, m);            // sort the left half
    mergeSort(m + 1, r);        // sort the right half
    merge(l, m, r);             // merge the two sorted halves
}

int main() {
    int n;
    cin >> n;
    a.resize(n);
    for (int &x : a) cin >> x;
    mergeSort(0, n - 1);
    cout << "Sorted: ";
    for (int x : a) cout << x << " ";
    cout << "\n";
    return 0;
}
`, '7\n38 27 43 3 9 82 10'],
['Algorithms, step by step', 'Quick sort', String.raw`#include <iostream>
#include <vector>
#include <utility>
using namespace std;

vector<int> a;

// Lomuto partition: values smaller than the pivot (the last element) go to its left
int partition(int lo, int hi) {
    int pivot = a[hi], i = lo;
    for (int j = lo; j < hi; j++)
        if (a[j] < pivot) swap(a[i++], a[j]);
    swap(a[i], a[hi]);
    return i;
}

void quickSort(int lo, int hi) {
    if (lo >= hi) return;
    int p = partition(lo, hi);
    cout << "Pivot " << a[p] << " placed at index " << p << " -> ";
    for (int x : a) cout << x << " ";
    cout << "\n";
    quickSort(lo, p - 1);
    quickSort(p + 1, hi);
}

int main() {
    int n;
    cin >> n;
    a.resize(n);
    for (int &x : a) cin >> x;
    quickSort(0, n - 1);
    cout << "Sorted: ";
    for (int x : a) cout << x << " ";
    cout << "\n";
    return 0;
}
`, '7\n10 80 30 90 40 50 70'],
['Algorithms, step by step', 'Binary search', String.raw`#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n, key;
    cin >> n;
    vector<int> a(n);
    for (int &x : a) cin >> x;        // must be sorted
    cin >> key;
    int lo = 0, hi = n - 1, step = 0, found = -1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        step++;
        cout << "Step " << step << ": low = " << lo << ", high = " << hi << ", mid = " << mid << ", a[mid] = " << a[mid] << " -> ";
        if (a[mid] == key) {
            cout << "found!\n";
            found = mid;
            break;
        }
        if (a[mid] < key) {
            cout << "too small, search the right half\n";
            lo = mid + 1;
        } else {
            cout << "too big, search the left half\n";
            hi = mid - 1;
        }
    }
    if (found >= 0) cout << key << " is at index " << found << "\n";
    else cout << key << " is not in the array\n";
    return 0;
}
`, '10\n2 5 8 12 16 23 38 56 72 91\n23'],
['Algorithms, step by step', 'Tower of Hanoi', String.raw`#include <iostream>
using namespace std;

int moves = 0;

// move n disks from 'from' to 'to', using 'via' as the spare peg
void hanoi(int n, char from, char to, char via) {
    if (n == 0) return;
    hanoi(n - 1, from, via, to);
    cout << "Move disk " << n << " from " << from << " to " << to << "\n";
    moves++;
    hanoi(n - 1, via, to, from);
}

int main() {
    int n;
    cin >> n;
    hanoi(n, 'A', 'C', 'B');
    cout << "Total moves: " << moves << " (2^" << n << " - 1)\n";
    return 0;
}
`, '3'],
['Algorithms, step by step', "Kadane's maximum subarray", String.raw`#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> a(n);
    for (int &x : a) cin >> x;
    int cur = a[0], best = a[0], start = 0, bestStart = 0, bestEnd = 0;
    cout << "a[0] = " << a[0] << ": current = " << cur << ", best = " << best << "\n";
    for (int i = 1; i < n; i++) {
        if (cur + a[i] < a[i]) {      // starting again here is better than extending
            cur = a[i];
            start = i;
        } else {
            cur += a[i];
        }
        if (cur > best) {
            best = cur;
            bestStart = start;
            bestEnd = i;
        }
        cout << "a[" << i << "] = " << a[i] << ": current = " << cur << ", best = " << best << "\n";
    }
    cout << "Maximum subarray sum = " << best << ", from index " << bestStart << " to " << bestEnd << ": ";
    for (int i = bestStart; i <= bestEnd; i++) cout << a[i] << " ";
    cout << "\n";
    return 0;
}
`, '9\n-2 1 -3 4 -1 2 1 -5 4'],
['Algorithms, step by step', 'BFS and DFS on a graph', String.raw`#include <iostream>
#include <vector>
#include <deque>
#include <algorithm>
using namespace std;

vector<vector<int>> adj;
vector<bool> visited;

void dfs(int u) {
    visited[u] = true;
    cout << u << " ";
    for (int v : adj[u])
        if (!visited[v]) dfs(v);
}

int main() {
    int n, m, start;
    cin >> n >> m;                          // vertices, edges
    adj.assign(n, {});
    for (int i = 0; i < m; i++) {
        int x, y;
        cin >> x >> y;
        adj[x].push_back(y);                // undirected
        adj[y].push_back(x);
    }
    for (auto &list : adj) sort(list.begin(), list.end());   // visit neighbours in increasing order
    cin >> start;

    visited.assign(n, false);
    deque<int> q;                           // a std::queue cannot be printed, so a deque is used
    visited[start] = true;
    q.push_back(start);
    cout << "BFS from " << start << ":\n";
    while (!q.empty()) {
        int u = q.front();
        q.pop_front();
        for (int v : adj[u])
            if (!visited[v]) {
                visited[v] = true;
                q.push_back(v);
            }
        cout << "visit " << u << ", queue: ";
        for (int x : q) cout << x << " ";
        cout << "\n";
    }

    visited.assign(n, false);
    cout << "DFS from " << start << ": ";
    dfs(start);
    cout << "\n";
    return 0;
}
`, '6 7\n0 1\n0 2\n1 3\n2 4\n3 5\n4 5\n1 4\n0']
];
