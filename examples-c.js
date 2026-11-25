// More C examples for the Example menu: [group, name, code, input]. The same programs exist in C++, Java and Python
// (examples-cpp.js, examples-java.js, examples-python.js) and print exactly the same output for the same input.
window.MORE_EXAMPLES = window.MORE_EXAMPLES || {};
MORE_EXAMPLES.c = [
['Classic programs', 'Fibonacci series', String.raw`#include <stdio.h>

// recursive definition: F(0) = 0, F(1) = 1, F(n) = F(n-1) + F(n-2)
long long fib(int n) {
    if (n < 2) return n;
    return fib(n - 1) + fib(n - 2);
}

int main(void) {
    int n;
    scanf("%d", &n);
    long long a = 0, b = 1;
    printf("First %d Fibonacci numbers:\n", n);
    for (int i = 0; i < n; i++) {
        printf("%lld ", a);
        long long next = a + b;
        a = b;
        b = next;
    }
    printf("\nTerm %d by recursion: %lld\n", n, fib(n));
    return 0;
}
`, '10'],
['Classic programs', 'Palindrome number', String.raw`#include <stdio.h>

int main(void) {
    long long n;
    scanf("%lld", &n);
    long long original = n, reversed = 0;
    while (n > 0) {
        reversed = reversed * 10 + n % 10;   // append the last digit
        n /= 10;                             // drop the last digit
    }
    printf("Reversed: %lld\n", reversed);
    if (original == reversed) printf("%lld is a palindrome\n", original);
    else printf("%lld is not a palindrome\n", original);
    return 0;
}
`, '12321'],
['Classic programs', 'Palindrome string', String.raw`#include <stdio.h>
#include <string.h>
#include <ctype.h>

int main(void) {
    char s[101];
    scanf("%100s", s);
    int i = 0, j = (int)strlen(s) - 1, ok = 1;
    while (i < j) {                           // compare from both ends, ignoring case
        if (tolower((unsigned char)s[i]) != tolower((unsigned char)s[j])) { ok = 0; break; }
        i++;
        j--;
    }
    printf("%s %s\n", s, ok ? "is a palindrome" : "is not a palindrome");
    return 0;
}
`, 'Madam'],
['Classic programs', 'Prime number check', String.raw`#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    int prime = n >= 2;
    for (int d = 2; d * d <= n; d++) {        // a divisor larger than sqrt(n) has a partner smaller than it
        if (n % d == 0) {
            printf("%d is divisible by %d\n", n, d);
            prime = 0;
            break;
        }
    }
    printf("%d %s\n", n, prime ? "is a prime number" : "is not a prime number");
    return 0;
}
`, '97'],
['Classic programs', 'Primes up to N (sieve)', String.raw`#include <stdio.h>
#include <stdbool.h>

// Sieve of Eratosthenes: cross out the multiples of every prime
int main(void) {
    int n;
    scanf("%d", &n);
    static bool crossed[100001];
    if (n > 100000) n = 100000;
    int count = 0;
    printf("Primes up to %d:\n", n);
    for (int i = 2; i <= n; i++) {
        if (crossed[i]) continue;
        printf("%d ", i);
        count++;
        for (long long j = (long long)i * i; j <= n; j += i) crossed[j] = true;
    }
    printf("\nCount: %d\n", count);
    return 0;
}
`, '50'],
['Classic programs', 'Reverse a number', String.raw`#include <stdio.h>

int main(void) {
    long long n;
    scanf("%lld", &n);
    long long reversed = 0;
    while (n > 0) {
        int digit = n % 10;
        reversed = reversed * 10 + digit;
        n /= 10;
        printf("digit %d -> reversed = %lld, left = %lld\n", digit, reversed, n);
    }
    printf("Reversed number: %lld\n", reversed);
    return 0;
}
`, '12345'],
['Classic programs', 'Count digits', String.raw`#include <stdio.h>

int main(void) {
    long long n;
    scanf("%lld", &n);
    long long m = n < 0 ? -n : n;
    int count = 0;
    do {                       // do-while, so that 0 counts as one digit
        count++;
        m /= 10;
    } while (m > 0);
    printf("%lld has %d digit%s\n", n, count, count == 1 ? "" : "s");
    return 0;
}
`, '908070'],
['Classic programs', 'Sum of digits', String.raw`#include <stdio.h>

int main(void) {
    long long n;
    scanf("%lld", &n);
    long long m = n;
    int sum = 0;
    while (m > 0) {
        sum += m % 10;
        m /= 10;
    }
    printf("Sum of digits of %lld = %d\n", n, sum);
    return 0;
}
`, '4721'],
['Classic programs', 'Armstrong number', String.raw`#include <stdio.h>

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

int isArmstrong(int n) {
    int k = countDigits(n), m = n;
    long long sum = 0;
    while (m > 0) {
        sum += power(m % 10, k);
        m /= 10;
    }
    return sum == n;
}

int main(void) {
    int n;
    scanf("%d", &n);
    printf("%d %s\n", n, isArmstrong(n) ? "is an Armstrong number" : "is not an Armstrong number");
    printf("Armstrong numbers up to 1000: ");
    for (int i = 1; i <= 1000; i++)
        if (isArmstrong(i)) printf("%d ", i);
    printf("\n");
    return 0;
}
`, '153'],
['Classic programs', 'Factorial', String.raw`#include <stdio.h>

long long factorial(int n) {          // recursion: n! = n * (n-1)!
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

int main(void) {
    int n;
    scanf("%d", &n);                  // long long holds factorials up to 20!
    long long f = 1;
    for (int i = 2; i <= n; i++) f *= i;
    printf("%d! = %lld (loop)\n", n, f);
    printf("%d! = %lld (recursion)\n", n, factorial(n));
    return 0;
}
`, '10'],
['Classic programs', 'GCD and LCM', String.raw`#include <stdio.h>

int main(void) {
    long long a, b;
    scanf("%lld %lld", &a, &b);
    long long x = a, y = b;
    while (y != 0) {                  // Euclid: gcd(x, y) = gcd(y, x % y)
        printf("gcd(%lld, %lld)\n", x, y);
        long long r = x % y;
        x = y;
        y = r;
    }
    printf("GCD = %lld\n", x);
    printf("LCM = %lld\n", a / x * b);   // divide first so the product does not overflow
    return 0;
}
`, '12 18'],
['Classic programs', 'Perfect number', String.raw`#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    int sum = 0;
    printf("Divisors of %d: ", n);
    for (int d = 1; d < n; d++) {
        if (n % d == 0) {
            printf("%d ", d);
            sum += d;
        }
    }
    printf("\nSum = %d\n", sum);
    printf("%d %s\n", n, sum == n ? "is a perfect number" : "is not a perfect number");
    return 0;
}
`, '28'],
['Classic programs', 'Leap year', String.raw`#include <stdio.h>

int main(void) {
    int y;
    scanf("%d", &y);
    // divisible by 4, except centuries, which must be divisible by 400
    int leap = (y % 4 == 0 && y % 100 != 0) || y % 400 == 0;
    printf("%d %s\n", y, leap ? "is a leap year" : "is not a leap year");
    return 0;
}
`, '2024'],
['Classic programs', 'Swap two numbers', String.raw`#include <stdio.h>

int main(void) {
    int a, b;
    scanf("%d %d", &a, &b);
    printf("Before: a = %d, b = %d\n", a, b);
    int t = a;                 // with a third variable
    a = b;
    b = t;
    printf("After swapping with a third variable: a = %d, b = %d\n", a, b);
    a = a + b;                 // without one
    b = a - b;
    a = a - b;
    printf("After swapping back without one: a = %d, b = %d\n", a, b);
    return 0;
}
`, '5 9'],

['Number conversions', 'Decimal to binary, octal, hex', String.raw`#include <stdio.h>

// repeated division: the remainders, read from last to first, are the digits
void toBase(long long n, int base, char *out) {
    const char *digits = "0123456789ABCDEF";
    char tmp[70];
    int k = 0;
    if (n == 0) tmp[k++] = '0';
    while (n > 0) {
        tmp[k++] = digits[n % base];
        n /= base;
    }
    for (int i = 0; i < k; i++) out[i] = tmp[k - 1 - i];
    out[k] = '\0';
}

int main(void) {
    long long n;
    scanf("%lld", &n);
    printf("Dividing by 2:\n");
    for (long long m = n; m > 0; m /= 2)
        printf("%lld / 2 = %lld remainder %lld\n", m, m / 2, m % 2);
    char s[70];
    toBase(n, 2, s);
    printf("Binary: %s\n", s);
    toBase(n, 8, s);
    printf("Octal: %s\n", s);
    toBase(n, 16, s);
    printf("Hexadecimal: %s\n", s);
    printf("Check: octal %llo, hex %llX\n", (unsigned long long)n, (unsigned long long)n);
    return 0;
}
`, '156'],
['Number conversions', 'Binary to decimal', String.raw`#include <stdio.h>

int main(void) {
    char s[65];
    scanf("%64s", s);
    long long value = 0;
    for (int i = 0; s[i] != '\0'; i++) {
        if (s[i] != '0' && s[i] != '1') {
            printf("'%c' is not a binary digit\n", s[i]);
            return 1;
        }
        value = value * 2 + (s[i] - '0');    // shift left by one place and add the new digit
        printf("after '%c': %lld\n", s[i], value);
    }
    printf("%s in decimal = %lld\n", s, value);
    return 0;
}
`, '101101'],
['Number conversions', 'Any base to any base', String.raw`#include <stdio.h>
#include <ctype.h>

int digitValue(char c) {
    if (isdigit((unsigned char)c)) return c - '0';
    c = (char)toupper((unsigned char)c);
    if (c >= 'A' && c <= 'Z') return c - 'A' + 10;
    return 99;
}

int main(void) {
    char s[65];
    int from, to;
    scanf("%64s %d %d", s, &from, &to);      // number, its base, the base to convert to (2 to 36)
    long long value = 0;
    for (int i = 0; s[i] != '\0'; i++) {
        int d = digitValue(s[i]);
        if (d >= from) {
            printf("'%c' is not a digit in base %d\n", s[i], from);
            return 1;
        }
        value = value * from + d;
    }
    const char *digits = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    char out[70];
    int k = 0;
    long long m = value;
    if (m == 0) out[k++] = '0';
    while (m > 0) {
        out[k++] = digits[m % to];
        m /= to;
    }
    printf("%s (base %d) = %lld (base 10) = ", s, from, value);
    for (int i = k - 1; i >= 0; i--) putchar(out[i]);
    printf(" (base %d)\n", to);
    return 0;
}
`, 'FF 16 2'],

['Patterns', 'Right triangle', String.raw`#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= i; j++) printf("* ");
        printf("\n");
    }
    return 0;
}
`, '5'],
['Patterns', 'Inverted triangle', String.raw`#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    for (int i = n; i >= 1; i--) {
        for (int j = 1; j <= i; j++) printf("* ");
        printf("\n");
    }
    return 0;
}
`, '5'],
['Patterns', 'Pyramid', String.raw`#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    for (int i = 1; i <= n; i++) {
        for (int s = 1; s <= n - i; s++) printf(" ");      // n - i spaces
        for (int j = 1; j <= 2 * i - 1; j++) printf("*");  // 2i - 1 stars
        printf("\n");
    }
    return 0;
}
`, '5'],
['Patterns', 'Diamond', String.raw`#include <stdio.h>

void row(int n, int i) {
    for (int s = 1; s <= n - i; s++) printf(" ");
    for (int j = 1; j <= 2 * i - 1; j++) printf("*");
    printf("\n");
}

int main(void) {
    int n;
    scanf("%d", &n);
    for (int i = 1; i <= n; i++) row(n, i);        // top half
    for (int i = n - 1; i >= 1; i--) row(n, i);    // bottom half
    return 0;
}
`, '5'],
['Patterns', "Floyd's triangle", String.raw`#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    int k = 1;
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= i; j++) printf("%d ", k++);
        printf("\n");
    }
    return 0;
}
`, '5'],
['Patterns', "Pascal's triangle", String.raw`#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    for (int i = 0; i < n; i++) {
        for (int s = 0; s < n - i - 1; s++) printf(" ");
        long long c = 1;                           // C(i, 0)
        for (int j = 0; j <= i; j++) {
            printf("%lld ", c);
            c = c * (i - j) / (j + 1);             // C(i, j+1) from C(i, j)
        }
        printf("\n");
    }
    return 0;
}
`, '5'],
['Patterns', 'Hollow square', String.raw`#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            if (i == 0 || i == n - 1 || j == 0 || j == n - 1) printf("* ");
            else printf("  ");
        }
        printf("\n");
    }
    return 0;
}
`, '5'],

['Arrays', 'Max, min, sum, average', String.raw`#include <stdio.h>

int main(void) {
    int n, a[100];
    scanf("%d", &n);
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);
    int mx = a[0], mn = a[0];
    long long sum = 0;
    for (int i = 0; i < n; i++) {
        if (a[i] > mx) mx = a[i];
        if (a[i] < mn) mn = a[i];
        sum += a[i];
    }
    printf("Max: %d\n", mx);
    printf("Min: %d\n", mn);
    printf("Sum: %lld\n", sum);
    printf("Average: %.2f\n", (double)sum / n);
    return 0;
}
`, '6\n4 8 15 16 23 42'],
['Arrays', 'Reverse an array', String.raw`#include <stdio.h>

void print(const char *label, int a[], int n) {
    printf("%s", label);
    for (int i = 0; i < n; i++) printf("%d ", a[i]);
    printf("\n");
}

int main(void) {
    int n, a[100];
    scanf("%d", &n);
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);
    print("Original: ", a, n);
    for (int i = 0, j = n - 1; i < j; i++, j--) {   // swap the two ends, move inwards
        int t = a[i];
        a[i] = a[j];
        a[j] = t;
    }
    print("Reversed: ", a, n);
    return 0;
}
`, '5\n1 2 3 4 5'],
['Arrays', 'Second largest', String.raw`#include <stdio.h>
#include <limits.h>

int main(void) {
    int n, a[100];
    scanf("%d", &n);
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);
    int first = INT_MIN, second = INT_MIN;
    for (int i = 0; i < n; i++) {
        if (a[i] > first) {
            second = first;
            first = a[i];
        } else if (a[i] > second && a[i] != first) {
            second = a[i];
        }
    }
    printf("Largest: %d\n", first);
    if (second == INT_MIN) printf("There is no second largest (all values are equal)\n");
    else printf("Second largest: %d\n", second);
    return 0;
}
`, '7\n12 35 1 10 34 1 35'],
['Arrays', 'Linear search', String.raw`#include <stdio.h>

int main(void) {
    int n, a[100], key;
    scanf("%d", &n);
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);
    scanf("%d", &key);
    int first = -1, count = 0;
    for (int i = 0; i < n; i++) {
        if (a[i] == key) {
            if (first < 0) first = i;
            count++;
        }
    }
    if (first < 0) printf("%d not found\n", key);
    else {
        printf("%d found at index %d\n", key, first);
        printf("%d appears %d time%s\n", key, count, count == 1 ? "" : "s");
    }
    return 0;
}
`, '6\n7 3 9 2 9 5\n9'],
['Arrays', 'Insert and delete', String.raw`#include <stdio.h>

void print(int a[], int n) {
    for (int i = 0; i < n; i++) printf("%d ", a[i]);
    printf("\n");
}

int main(void) {
    int n, a[101], pos, value, del;
    scanf("%d", &n);
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);
    scanf("%d %d", &pos, &value);     // insert value at index pos
    scanf("%d", &del);                // then delete the element at index del
    printf("Array: ");
    print(a, n);
    if (pos < 0 || pos > n) { printf("Invalid position\n"); return 1; }
    for (int i = n; i > pos; i--) a[i] = a[i - 1];   // shift right to make room
    a[pos] = value;
    n++;
    printf("After inserting %d at index %d: ", value, pos);
    print(a, n);
    if (del < 0 || del >= n) { printf("Invalid position\n"); return 1; }
    for (int i = del; i < n - 1; i++) a[i] = a[i + 1];   // shift left to close the gap
    n--;
    printf("After deleting index %d: ", del);
    print(a, n);
    return 0;
}
`, '5\n10 20 30 40 50\n2 25\n4'],
['Arrays', 'Rotate by k', String.raw`#include <stdio.h>

int main(void) {
    int n, a[100], b[100], k;
    scanf("%d", &n);
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);
    scanf("%d", &k);
    k %= n;
    for (int i = 0; i < n; i++) b[i] = a[(i + k) % n];
    printf("Rotated left by %d: ", k);
    for (int i = 0; i < n; i++) printf("%d ", b[i]);
    printf("\n");
    for (int i = 0; i < n; i++) b[(i + k) % n] = a[i];
    printf("Rotated right by %d: ", k);
    for (int i = 0; i < n; i++) printf("%d ", b[i]);
    printf("\n");
    return 0;
}
`, '7\n1 2 3 4 5 6 7\n3'],
['Arrays', 'Remove duplicates (sorted)', String.raw`#include <stdio.h>

int main(void) {
    int n, a[100];
    scanf("%d", &n);
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);
    int k = 0;                        // a[0..k-1] holds the values kept so far
    for (int i = 0; i < n; i++)
        if (k == 0 || a[i] != a[k - 1]) a[k++] = a[i];
    printf("After removing duplicates: ");
    for (int i = 0; i < k; i++) printf("%d ", a[i]);
    printf("\nNew length: %d\n", k);
    return 0;
}
`, '9\n1 1 2 2 2 3 4 4 5'],
['Arrays', 'Frequency of each element', String.raw`#include <stdio.h>

int main(void) {
    int n, a[100], counted[100] = {0};
    scanf("%d", &n);
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);
    for (int i = 0; i < n; i++) {
        if (counted[i]) continue;     // already counted with an earlier equal value
        int c = 0;
        for (int j = i; j < n; j++) {
            if (a[j] == a[i]) {
                c++;
                counted[j] = 1;
            }
        }
        printf("%d occurs %d time%s\n", a[i], c, c == 1 ? "" : "s");
    }
    return 0;
}
`, '10\n3 1 3 2 1 3 4 2 3 1'],
['Arrays', 'Matrix add, multiply, transpose', String.raw`#include <stdio.h>

int n, A[10][10], B[10][10], C[10][10];

void show(const char *title, int M[10][10]) {
    printf("%s\n", title);
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) printf("%4d", M[i][j]);
        printf("\n");
    }
}

int main(void) {
    scanf("%d", &n);
    for (int i = 0; i < n; i++) for (int j = 0; j < n; j++) scanf("%d", &A[i][j]);
    for (int i = 0; i < n; i++) for (int j = 0; j < n; j++) scanf("%d", &B[i][j]);
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

['Algorithms, step by step', 'Bubble sort', String.raw`#include <stdio.h>

void print(int a[], int n) {
    for (int i = 0; i < n; i++) printf("%d ", a[i]);
}

int main(void) {
    int n, a[100];
    scanf("%d", &n);
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);
    printf("Start: ");
    print(a, n);
    printf("\n");
    for (int pass = 1; pass < n; pass++) {
        int swaps = 0;
        for (int j = 0; j < n - pass; j++) {   // the largest value bubbles to the end
            if (a[j] > a[j + 1]) {
                int t = a[j];
                a[j] = a[j + 1];
                a[j + 1] = t;
                swaps++;
            }
        }
        printf("Pass %d: ", pass);
        print(a, n);
        printf("(swaps: %d)\n", swaps);
        if (swaps == 0) {
            printf("No swaps, so the array is sorted.\n");
            break;
        }
    }
    printf("Sorted: ");
    print(a, n);
    printf("\n");
    return 0;
}
`, '6\n5 1 4 2 8 0'],
['Algorithms, step by step', 'Selection sort', String.raw`#include <stdio.h>

int main(void) {
    int n, a[100];
    scanf("%d", &n);
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);
    for (int i = 0; i < n - 1; i++) {
        int m = i;                              // index of the smallest value in a[i..n-1]
        for (int j = i + 1; j < n; j++)
            if (a[j] < a[m]) m = j;
        int t = a[i];
        a[i] = a[m];
        a[m] = t;
        printf("Step %d: smallest of the rest is %d, put at index %d -> ", i + 1, a[i], i);
        for (int k = 0; k < n; k++) printf("%d ", a[k]);
        printf("\n");
    }
    return 0;
}
`, '6\n64 25 12 22 11 90'],
['Algorithms, step by step', 'Insertion sort', String.raw`#include <stdio.h>

int main(void) {
    int n, a[100];
    scanf("%d", &n);
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);
    for (int i = 1; i < n; i++) {
        int key = a[i], j = i - 1;
        while (j >= 0 && a[j] > key) {        // shift bigger values one place right
            a[j + 1] = a[j];
            j--;
        }
        a[j + 1] = key;
        printf("Insert %d -> ", key);
        for (int k = 0; k < n; k++) printf("%d ", a[k]);
        printf("\n");
    }
    return 0;
}
`, '6\n12 11 13 5 6 7'],
['Algorithms, step by step', 'Merge sort', String.raw`#include <stdio.h>

int a[100];

void merge(int l, int m, int r) {
    int tmp[100], i = l, j = m + 1, k = 0;
    while (i <= m && j <= r) tmp[k++] = a[i] <= a[j] ? a[i++] : a[j++];
    while (i <= m) tmp[k++] = a[i++];
    while (j <= r) tmp[k++] = a[j++];
    for (int t = 0; t < k; t++) a[l + t] = tmp[t];
    printf("Merge [%d..%d] + [%d..%d] -> ", l, m, m + 1, r);
    for (int t = l; t <= r; t++) printf("%d ", a[t]);
    printf("\n");
}

void mergeSort(int l, int r) {
    if (l >= r) return;
    int m = (l + r) / 2;
    mergeSort(l, m);            // sort the left half
    mergeSort(m + 1, r);        // sort the right half
    merge(l, m, r);             // merge the two sorted halves
}

int main(void) {
    int n;
    scanf("%d", &n);
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);
    mergeSort(0, n - 1);
    printf("Sorted: ");
    for (int i = 0; i < n; i++) printf("%d ", a[i]);
    printf("\n");
    return 0;
}
`, '7\n38 27 43 3 9 82 10'],
['Algorithms, step by step', 'Quick sort', String.raw`#include <stdio.h>

int n, a[100];

void swap(int *x, int *y) { int t = *x; *x = *y; *y = t; }

// Lomuto partition: values smaller than the pivot (the last element) go to its left
int partition(int lo, int hi) {
    int pivot = a[hi], i = lo;
    for (int j = lo; j < hi; j++)
        if (a[j] < pivot) swap(&a[i++], &a[j]);
    swap(&a[i], &a[hi]);
    return i;
}

void quickSort(int lo, int hi) {
    if (lo >= hi) return;
    int p = partition(lo, hi);
    printf("Pivot %d placed at index %d -> ", a[p], p);
    for (int i = 0; i < n; i++) printf("%d ", a[i]);
    printf("\n");
    quickSort(lo, p - 1);
    quickSort(p + 1, hi);
}

int main(void) {
    scanf("%d", &n);
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);
    quickSort(0, n - 1);
    printf("Sorted: ");
    for (int i = 0; i < n; i++) printf("%d ", a[i]);
    printf("\n");
    return 0;
}
`, '7\n10 80 30 90 40 50 70'],
['Algorithms, step by step', 'Binary search', String.raw`#include <stdio.h>

int main(void) {
    int n, a[100], key;
    scanf("%d", &n);
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);   // must be sorted
    scanf("%d", &key);
    int lo = 0, hi = n - 1, step = 0, found = -1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        step++;
        printf("Step %d: low = %d, high = %d, mid = %d, a[mid] = %d -> ", step, lo, hi, mid, a[mid]);
        if (a[mid] == key) {
            printf("found!\n");
            found = mid;
            break;
        }
        if (a[mid] < key) {
            printf("too small, search the right half\n");
            lo = mid + 1;
        } else {
            printf("too big, search the left half\n");
            hi = mid - 1;
        }
    }
    if (found >= 0) printf("%d is at index %d\n", key, found);
    else printf("%d is not in the array\n", key);
    return 0;
}
`, '10\n2 5 8 12 16 23 38 56 72 91\n23'],
['Algorithms, step by step', 'Tower of Hanoi', String.raw`#include <stdio.h>

int moves = 0;

// move n disks from 'from' to 'to', using 'via' as the spare peg
void hanoi(int n, char from, char to, char via) {
    if (n == 0) return;
    hanoi(n - 1, from, via, to);
    printf("Move disk %d from %c to %c\n", n, from, to);
    moves++;
    hanoi(n - 1, via, to, from);
}

int main(void) {
    int n;
    scanf("%d", &n);
    hanoi(n, 'A', 'C', 'B');
    printf("Total moves: %d (2^%d - 1)\n", moves, n);
    return 0;
}
`, '3'],
['Algorithms, step by step', "Kadane's maximum subarray", String.raw`#include <stdio.h>

int main(void) {
    int n, a[100];
    scanf("%d", &n);
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);
    int cur = a[0], best = a[0], start = 0, bestStart = 0, bestEnd = 0;
    printf("a[0] = %d: current = %d, best = %d\n", a[0], cur, best);
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
        printf("a[%d] = %d: current = %d, best = %d\n", i, a[i], cur, best);
    }
    printf("Maximum subarray sum = %d, from index %d to %d: ", best, bestStart, bestEnd);
    for (int i = bestStart; i <= bestEnd; i++) printf("%d ", a[i]);
    printf("\n");
    return 0;
}
`, '9\n-2 1 -3 4 -1 2 1 -5 4'],
['Algorithms, step by step', 'BFS and DFS on a graph', String.raw`#include <stdio.h>

int n, adj[20][20], visited[20];

void dfs(int u) {
    visited[u] = 1;
    printf("%d ", u);
    for (int v = 0; v < n; v++)
        if (adj[u][v] && !visited[v]) dfs(v);
}

int main(void) {
    int m, start;
    scanf("%d %d", &n, &m);                 // vertices, edges
    for (int i = 0; i < m; i++) {
        int x, y;
        scanf("%d %d", &x, &y);
        adj[x][y] = adj[y][x] = 1;          // undirected
    }
    scanf("%d", &start);

    int queue[20], head = 0, tail = 0;
    visited[start] = 1;
    queue[tail++] = start;
    printf("BFS from %d:\n", start);
    while (head < tail) {
        int u = queue[head++];
        for (int v = 0; v < n; v++)
            if (adj[u][v] && !visited[v]) {
                visited[v] = 1;
                queue[tail++] = v;
            }
        printf("visit %d, queue: ", u);
        for (int i = head; i < tail; i++) printf("%d ", queue[i]);
        printf("\n");
    }

    for (int i = 0; i < n; i++) visited[i] = 0;
    printf("DFS from %d: ", start);
    dfs(start);
    printf("\n");
    return 0;
}
`, '6 7\n0 1\n0 2\n1 3\n2 4\n3 5\n4 5\n1 4\n0']
];
