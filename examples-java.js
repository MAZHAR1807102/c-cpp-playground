// More Java examples for the Example menu: [group, name, code, input]. Same programs and output as examples-c.js.
window.MORE_EXAMPLES = window.MORE_EXAMPLES || {};
MORE_EXAMPLES.java = [
['Classic programs', 'Fibonacci series', String.raw`import java.util.Scanner;

public class Main {
    // recursive definition: F(0) = 0, F(1) = 1, F(n) = F(n-1) + F(n-2)
    static long fib(int n) {
        if (n < 2) return n;
        return fib(n - 1) + fib(n - 2);
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        long a = 0, b = 1;
        System.out.println("First " + n + " Fibonacci numbers:");
        for (int i = 0; i < n; i++) {
            System.out.print(a + " ");
            long next = a + b;
            a = b;
            b = next;
        }
        System.out.println();
        System.out.println("Term " + n + " by recursion: " + fib(n));
    }
}
`, '10'],
['Classic programs', 'Palindrome number', String.raw`import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        long n = sc.nextLong();
        long original = n, reversed = 0;
        while (n > 0) {
            reversed = reversed * 10 + n % 10;   // append the last digit
            n /= 10;                             // drop the last digit
        }
        System.out.println("Reversed: " + reversed);
        if (original == reversed) System.out.println(original + " is a palindrome");
        else System.out.println(original + " is not a palindrome");
    }
}
`, '12321'],
['Classic programs', 'Palindrome string', String.raw`import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.next();
        boolean ok = true;
        for (int i = 0, j = s.length() - 1; i < j; i++, j--) {   // compare from both ends, ignoring case
            if (Character.toLowerCase(s.charAt(i)) != Character.toLowerCase(s.charAt(j))) {
                ok = false;
                break;
            }
        }
        System.out.println(s + (ok ? " is a palindrome" : " is not a palindrome"));
    }
}
`, 'Madam'],
['Classic programs', 'Prime number check', String.raw`import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        boolean prime = n >= 2;
        for (int d = 2; d * d <= n; d++) {        // a divisor larger than sqrt(n) has a partner smaller than it
            if (n % d == 0) {
                System.out.println(n + " is divisible by " + d);
                prime = false;
                break;
            }
        }
        System.out.println(n + (prime ? " is a prime number" : " is not a prime number"));
    }
}
`, '97'],
['Classic programs', 'Primes up to N (sieve)', String.raw`import java.util.Scanner;

public class Main {
    // Sieve of Eratosthenes: cross out the multiples of every prime
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        boolean[] crossed = new boolean[n + 1];
        int count = 0;
        System.out.println("Primes up to " + n + ":");
        for (int i = 2; i <= n; i++) {
            if (crossed[i]) continue;
            System.out.print(i + " ");
            count++;
            for (long j = (long) i * i; j <= n; j += i) crossed[(int) j] = true;
        }
        System.out.println();
        System.out.println("Count: " + count);
    }
}
`, '50'],
['Classic programs', 'Reverse a number', String.raw`import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        long n = sc.nextLong();
        long reversed = 0;
        while (n > 0) {
            int digit = (int) (n % 10);
            reversed = reversed * 10 + digit;
            n /= 10;
            System.out.println("digit " + digit + " -> reversed = " + reversed + ", left = " + n);
        }
        System.out.println("Reversed number: " + reversed);
    }
}
`, '12345'],
['Classic programs', 'Count digits', String.raw`import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        long n = sc.nextLong();
        long m = Math.abs(n);
        int count = 0;
        do {                       // do-while, so that 0 counts as one digit
            count++;
            m /= 10;
        } while (m > 0);
        System.out.println(n + " has " + count + " digit" + (count == 1 ? "" : "s"));
    }
}
`, '908070'],
['Classic programs', 'Sum of digits', String.raw`import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        long n = sc.nextLong();
        long m = n;
        int sum = 0;
        while (m > 0) {
            sum += m % 10;
            m /= 10;
        }
        System.out.println("Sum of digits of " + n + " = " + sum);
    }
}
`, '4721'],
['Classic programs', 'Armstrong number', String.raw`import java.util.Scanner;

public class Main {
    // an Armstrong number equals the sum of its digits, each raised to the number of digits: 153 = 1^3 + 5^3 + 3^3
    static long power(int base, int exp) {
        long r = 1;
        while (exp-- > 0) r *= base;
        return r;
    }

    static int countDigits(int n) {
        int c = 0;
        do { c++; n /= 10; } while (n > 0);
        return c;
    }

    static boolean isArmstrong(int n) {
        int k = countDigits(n), m = n;
        long sum = 0;
        while (m > 0) {
            sum += power(m % 10, k);
            m /= 10;
        }
        return sum == n;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        System.out.println(n + (isArmstrong(n) ? " is an Armstrong number" : " is not an Armstrong number"));
        System.out.print("Armstrong numbers up to 1000: ");
        for (int i = 1; i <= 1000; i++)
            if (isArmstrong(i)) System.out.print(i + " ");
        System.out.println();
    }
}
`, '153'],
['Classic programs', 'Factorial', String.raw`import java.util.Scanner;

public class Main {
    static long factorial(int n) {        // recursion: n! = n * (n-1)!
        if (n <= 1) return 1;
        return n * factorial(n - 1);
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();             // long holds factorials up to 20! (BigInteger for more)
        long f = 1;
        for (int i = 2; i <= n; i++) f *= i;
        System.out.println(n + "! = " + f + " (loop)");
        System.out.println(n + "! = " + factorial(n) + " (recursion)");
    }
}
`, '10'],
['Classic programs', 'GCD and LCM', String.raw`import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        long a = sc.nextLong(), b = sc.nextLong();
        long x = a, y = b;
        while (y != 0) {                  // Euclid: gcd(x, y) = gcd(y, x % y)
            System.out.println("gcd(" + x + ", " + y + ")");
            long r = x % y;
            x = y;
            y = r;
        }
        System.out.println("GCD = " + x);
        System.out.println("LCM = " + (a / x * b));   // divide first so the product does not overflow
    }
}
`, '12 18'],
['Classic programs', 'Perfect number', String.raw`import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int sum = 0;
        System.out.print("Divisors of " + n + ": ");
        for (int d = 1; d < n; d++) {
            if (n % d == 0) {
                System.out.print(d + " ");
                sum += d;
            }
        }
        System.out.println();
        System.out.println("Sum = " + sum);
        System.out.println(n + (sum == n ? " is a perfect number" : " is not a perfect number"));
    }
}
`, '28'],
['Classic programs', 'Leap year', String.raw`import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int y = sc.nextInt();
        // divisible by 4, except centuries, which must be divisible by 400
        boolean leap = (y % 4 == 0 && y % 100 != 0) || y % 400 == 0;
        System.out.println(y + (leap ? " is a leap year" : " is not a leap year"));
    }
}
`, '2024'],
['Classic programs', 'Swap two numbers', String.raw`import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int a = sc.nextInt(), b = sc.nextInt();
        System.out.println("Before: a = " + a + ", b = " + b);
        int t = a;                 // with a third variable
        a = b;
        b = t;
        System.out.println("After swapping with a third variable: a = " + a + ", b = " + b);
        a = a + b;                 // without one
        b = a - b;
        a = a - b;
        System.out.println("After swapping back without one: a = " + a + ", b = " + b);
    }
}
`, '5 9'],

['Number conversions', 'Decimal to binary, octal, hex', String.raw`import java.util.Scanner;

public class Main {
    // repeated division: the remainders, read from last to first, are the digits
    static String toBase(long n, int base) {
        String digits = "0123456789ABCDEF";
        if (n == 0) return "0";
        StringBuilder sb = new StringBuilder();
        while (n > 0) {
            sb.append(digits.charAt((int) (n % base)));
            n /= base;
        }
        return sb.reverse().toString();
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        long n = sc.nextLong();
        System.out.println("Dividing by 2:");
        for (long m = n; m > 0; m /= 2)
            System.out.println(m + " / 2 = " + (m / 2) + " remainder " + (m % 2));
        System.out.println("Binary: " + toBase(n, 2));
        System.out.println("Octal: " + toBase(n, 8));
        System.out.println("Hexadecimal: " + toBase(n, 16));
        System.out.println("Check: octal " + Long.toOctalString(n) + ", hex " + Long.toHexString(n).toUpperCase());
    }
}
`, '156'],
['Number conversions', 'Binary to decimal', String.raw`import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.next();
        long value = 0;
        for (char c : s.toCharArray()) {
            if (c != '0' && c != '1') {
                System.out.println("'" + c + "' is not a binary digit");
                return;
            }
            value = value * 2 + (c - '0');    // shift left by one place and add the new digit
            System.out.println("after '" + c + "': " + value);
        }
        System.out.println(s + " in decimal = " + value);   // Long.parseLong(s, 2) does the same
    }
}
`, '101101'],
['Number conversions', 'Any base to any base', String.raw`import java.util.Scanner;

public class Main {
    static int digitValue(char c) {
        if (Character.isDigit(c)) return c - '0';
        c = Character.toUpperCase(c);
        if (c >= 'A' && c <= 'Z') return c - 'A' + 10;
        return 99;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.next();             // number, its base, the base to convert to (2 to 36)
        int from = sc.nextInt(), to = sc.nextInt();
        long value = 0;
        for (char c : s.toCharArray()) {
            int d = digitValue(c);
            if (d >= from) {
                System.out.println("'" + c + "' is not a digit in base " + from);
                return;
            }
            value = value * from + d;
        }
        String digits = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        StringBuilder out = new StringBuilder();
        long m = value;
        if (m == 0) out.append('0');
        while (m > 0) {
            out.append(digits.charAt((int) (m % to)));
            m /= to;
        }
        System.out.println(s + " (base " + from + ") = " + value + " (base 10) = " + out.reverse() + " (base " + to + ")");
    }
}
`, 'FF 16 2'],

['Patterns', 'Right triangle', String.raw`import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        for (int i = 1; i <= n; i++) {
            for (int j = 1; j <= i; j++) System.out.print("* ");
            System.out.println();
        }
    }
}
`, '5'],
['Patterns', 'Inverted triangle', String.raw`import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        for (int i = n; i >= 1; i--) {
            for (int j = 1; j <= i; j++) System.out.print("* ");
            System.out.println();
        }
    }
}
`, '5'],
['Patterns', 'Pyramid', String.raw`import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        for (int i = 1; i <= n; i++)
            System.out.println(" ".repeat(n - i) + "*".repeat(2 * i - 1));   // n - i spaces, 2i - 1 stars
    }
}
`, '5'],
['Patterns', 'Diamond', String.raw`import java.util.Scanner;

public class Main {
    static void row(int n, int i) {
        System.out.println(" ".repeat(n - i) + "*".repeat(2 * i - 1));
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        for (int i = 1; i <= n; i++) row(n, i);        // top half
        for (int i = n - 1; i >= 1; i--) row(n, i);    // bottom half
    }
}
`, '5'],
['Patterns', "Floyd's triangle", String.raw`import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int k = 1;
        for (int i = 1; i <= n; i++) {
            for (int j = 1; j <= i; j++) System.out.print(k++ + " ");
            System.out.println();
        }
    }
}
`, '5'],
['Patterns', "Pascal's triangle", String.raw`import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        for (int i = 0; i < n; i++) {
            System.out.print(" ".repeat(n - i - 1));
            long c = 1;                                // C(i, 0)
            for (int j = 0; j <= i; j++) {
                System.out.print(c + " ");
                c = c * (i - j) / (j + 1);             // C(i, j+1) from C(i, j)
            }
            System.out.println();
        }
    }
}
`, '5'],
['Patterns', 'Hollow square', String.raw`import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                boolean edge = i == 0 || i == n - 1 || j == 0 || j == n - 1;
                System.out.print(edge ? "* " : "  ");
            }
            System.out.println();
        }
    }
}
`, '5'],

['Arrays', 'Max, min, sum, average', String.raw`import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int[] a = new int[n];
        for (int i = 0; i < n; i++) a[i] = sc.nextInt();
        int mx = a[0], mn = a[0];
        long sum = 0;
        for (int x : a) {
            mx = Math.max(mx, x);
            mn = Math.min(mn, x);
            sum += x;
        }
        System.out.println("Max: " + mx);
        System.out.println("Min: " + mn);
        System.out.println("Sum: " + sum);
        System.out.printf("Average: %.2f\n", (double) sum / n);
    }
}
`, '6\n4 8 15 16 23 42'],
['Arrays', 'Reverse an array', String.raw`import java.util.Scanner;

public class Main {
    static void print(String label, int[] a) {
        System.out.print(label);
        for (int x : a) System.out.print(x + " ");
        System.out.println();
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int[] a = new int[n];
        for (int i = 0; i < n; i++) a[i] = sc.nextInt();
        print("Original: ", a);
        for (int i = 0, j = n - 1; i < j; i++, j--) {   // swap the two ends, move inwards
            int t = a[i];
            a[i] = a[j];
            a[j] = t;
        }
        print("Reversed: ", a);
    }
}
`, '5\n1 2 3 4 5'],
['Arrays', 'Second largest', String.raw`import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int[] a = new int[n];
        for (int i = 0; i < n; i++) a[i] = sc.nextInt();
        int first = Integer.MIN_VALUE, second = Integer.MIN_VALUE;
        for (int x : a) {
            if (x > first) {
                second = first;
                first = x;
            } else if (x > second && x != first) {
                second = x;
            }
        }
        System.out.println("Largest: " + first);
        if (second == Integer.MIN_VALUE) System.out.println("There is no second largest (all values are equal)");
        else System.out.println("Second largest: " + second);
    }
}
`, '7\n12 35 1 10 34 1 35'],
['Arrays', 'Linear search', String.raw`import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int[] a = new int[n];
        for (int i = 0; i < n; i++) a[i] = sc.nextInt();
        int key = sc.nextInt();
        int first = -1, count = 0;
        for (int i = 0; i < n; i++) {
            if (a[i] == key) {
                if (first < 0) first = i;
                count++;
            }
        }
        if (first < 0) System.out.println(key + " not found");
        else {
            System.out.println(key + " found at index " + first);
            System.out.println(key + " appears " + count + " time" + (count == 1 ? "" : "s"));
        }
    }
}
`, '6\n7 3 9 2 9 5\n9'],
['Arrays', 'Insert and delete', String.raw`import java.util.ArrayList;
import java.util.Scanner;

public class Main {
    static void print(ArrayList<Integer> a) {
        for (int x : a) System.out.print(x + " ");
        System.out.println();
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        ArrayList<Integer> a = new ArrayList<>();
        for (int i = 0; i < n; i++) a.add(sc.nextInt());
        int pos = sc.nextInt(), value = sc.nextInt();   // insert value at index pos
        int del = sc.nextInt();                         // then delete index del
        System.out.print("Array: ");
        print(a);
        if (pos < 0 || pos > a.size()) { System.out.println("Invalid position"); return; }
        a.add(pos, value);                // ArrayList shifts the elements for us
        System.out.print("After inserting " + value + " at index " + pos + ": ");
        print(a);
        if (del < 0 || del >= a.size()) { System.out.println("Invalid position"); return; }
        a.remove(del);                    // remove(int index), not remove(Object)
        System.out.print("After deleting index " + del + ": ");
        print(a);
    }
}
`, '5\n10 20 30 40 50\n2 25\n4'],
['Arrays', 'Rotate by k', String.raw`import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int[] a = new int[n], b = new int[n];
        for (int i = 0; i < n; i++) a[i] = sc.nextInt();
        int k = sc.nextInt() % n;
        for (int i = 0; i < n; i++) b[i] = a[(i + k) % n];
        System.out.print("Rotated left by " + k + ": ");
        for (int x : b) System.out.print(x + " ");
        System.out.println();
        for (int i = 0; i < n; i++) b[(i + k) % n] = a[i];
        System.out.print("Rotated right by " + k + ": ");
        for (int x : b) System.out.print(x + " ");
        System.out.println();
    }
}
`, '7\n1 2 3 4 5 6 7\n3'],
['Arrays', 'Remove duplicates (sorted)', String.raw`import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int[] a = new int[n];
        for (int i = 0; i < n; i++) a[i] = sc.nextInt();
        int k = 0;                        // a[0..k-1] holds the values kept so far
        for (int i = 0; i < n; i++)
            if (k == 0 || a[i] != a[k - 1]) a[k++] = a[i];
        System.out.print("After removing duplicates: ");
        for (int i = 0; i < k; i++) System.out.print(a[i] + " ");
        System.out.println();
        System.out.println("New length: " + k);
    }
}
`, '9\n1 1 2 2 2 3 4 4 5'],
['Arrays', 'Frequency of each element', String.raw`import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        // LinkedHashMap keeps the values in the order they first appear
        Map<Integer, Integer> count = new LinkedHashMap<>();
        for (int i = 0; i < n; i++) {
            int x = sc.nextInt();
            count.put(x, count.getOrDefault(x, 0) + 1);
        }
        for (Map.Entry<Integer, Integer> e : count.entrySet())
            System.out.println(e.getKey() + " occurs " + e.getValue() + " time" + (e.getValue() == 1 ? "" : "s"));
    }
}
`, '10\n3 1 3 2 1 3 4 2 3 1'],
['Arrays', 'Matrix add, multiply, transpose', String.raw`import java.util.Scanner;

public class Main {
    static void show(String title, int[][] M) {
        System.out.println(title);
        for (int[] row : M) {
            for (int x : row) System.out.printf("%4d", x);
            System.out.println();
        }
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int[][] A = new int[n][n], B = new int[n][n], C = new int[n][n];
        for (int i = 0; i < n; i++) for (int j = 0; j < n; j++) A[i][j] = sc.nextInt();
        for (int i = 0; i < n; i++) for (int j = 0; j < n; j++) B[i][j] = sc.nextInt();
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
    }
}
`, '2\n1 2\n3 4\n5 6\n7 8'],

['Algorithms, step by step', 'Bubble sort', String.raw`import java.util.Scanner;

public class Main {
    static void print(int[] a) { for (int x : a) System.out.print(x + " "); }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int[] a = new int[n];
        for (int i = 0; i < n; i++) a[i] = sc.nextInt();
        System.out.print("Start: ");
        print(a);
        System.out.println();
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
            System.out.print("Pass " + pass + ": ");
            print(a);
            System.out.println("(swaps: " + swaps + ")");
            if (swaps == 0) {
                System.out.println("No swaps, so the array is sorted.");
                break;
            }
        }
        System.out.print("Sorted: ");
        print(a);
        System.out.println();
    }
}
`, '6\n5 1 4 2 8 0'],
['Algorithms, step by step', 'Selection sort', String.raw`import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int[] a = new int[n];
        for (int i = 0; i < n; i++) a[i] = sc.nextInt();
        for (int i = 0; i < n - 1; i++) {
            int m = i;                              // index of the smallest value in a[i..n-1]
            for (int j = i + 1; j < n; j++)
                if (a[j] < a[m]) m = j;
            int t = a[i];
            a[i] = a[m];
            a[m] = t;
            System.out.print("Step " + (i + 1) + ": smallest of the rest is " + a[i] + ", put at index " + i + " -> ");
            for (int x : a) System.out.print(x + " ");
            System.out.println();
        }
    }
}
`, '6\n64 25 12 22 11 90'],
['Algorithms, step by step', 'Insertion sort', String.raw`import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int[] a = new int[n];
        for (int i = 0; i < n; i++) a[i] = sc.nextInt();
        for (int i = 1; i < n; i++) {
            int key = a[i], j = i - 1;
            while (j >= 0 && a[j] > key) {        // shift bigger values one place right
                a[j + 1] = a[j];
                j--;
            }
            a[j + 1] = key;
            System.out.print("Insert " + key + " -> ");
            for (int x : a) System.out.print(x + " ");
            System.out.println();
        }
    }
}
`, '6\n12 11 13 5 6 7'],
['Algorithms, step by step', 'Merge sort', String.raw`import java.util.Scanner;

public class Main {
    static int[] a;

    static void merge(int l, int m, int r) {
        int[] tmp = new int[r - l + 1];
        int i = l, j = m + 1, k = 0;
        while (i <= m && j <= r) tmp[k++] = a[i] <= a[j] ? a[i++] : a[j++];
        while (i <= m) tmp[k++] = a[i++];
        while (j <= r) tmp[k++] = a[j++];
        for (int t = 0; t < k; t++) a[l + t] = tmp[t];
        System.out.print("Merge [" + l + ".." + m + "] + [" + (m + 1) + ".." + r + "] -> ");
        for (int t = l; t <= r; t++) System.out.print(a[t] + " ");
        System.out.println();
    }

    static void mergeSort(int l, int r) {
        if (l >= r) return;
        int m = (l + r) / 2;
        mergeSort(l, m);            // sort the left half
        mergeSort(m + 1, r);        // sort the right half
        merge(l, m, r);             // merge the two sorted halves
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        a = new int[n];
        for (int i = 0; i < n; i++) a[i] = sc.nextInt();
        mergeSort(0, n - 1);
        System.out.print("Sorted: ");
        for (int x : a) System.out.print(x + " ");
        System.out.println();
    }
}
`, '7\n38 27 43 3 9 82 10'],
['Algorithms, step by step', 'Quick sort', String.raw`import java.util.Scanner;

public class Main {
    static int[] a;

    static void swap(int i, int j) { int t = a[i]; a[i] = a[j]; a[j] = t; }

    // Lomuto partition: values smaller than the pivot (the last element) go to its left
    static int partition(int lo, int hi) {
        int pivot = a[hi], i = lo;
        for (int j = lo; j < hi; j++)
            if (a[j] < pivot) swap(i++, j);
        swap(i, hi);
        return i;
    }

    static void quickSort(int lo, int hi) {
        if (lo >= hi) return;
        int p = partition(lo, hi);
        System.out.print("Pivot " + a[p] + " placed at index " + p + " -> ");
        for (int x : a) System.out.print(x + " ");
        System.out.println();
        quickSort(lo, p - 1);
        quickSort(p + 1, hi);
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        a = new int[n];
        for (int i = 0; i < n; i++) a[i] = sc.nextInt();
        quickSort(0, n - 1);
        System.out.print("Sorted: ");
        for (int x : a) System.out.print(x + " ");
        System.out.println();
    }
}
`, '7\n10 80 30 90 40 50 70'],
['Algorithms, step by step', 'Binary search', String.raw`import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int[] a = new int[n];
        for (int i = 0; i < n; i++) a[i] = sc.nextInt();   // must be sorted
        int key = sc.nextInt();
        int lo = 0, hi = n - 1, step = 0, found = -1;
        while (lo <= hi) {
            int mid = lo + (hi - lo) / 2;
            step++;
            System.out.print("Step " + step + ": low = " + lo + ", high = " + hi + ", mid = " + mid + ", a[mid] = " + a[mid] + " -> ");
            if (a[mid] == key) {
                System.out.println("found!");
                found = mid;
                break;
            }
            if (a[mid] < key) {
                System.out.println("too small, search the right half");
                lo = mid + 1;
            } else {
                System.out.println("too big, search the left half");
                hi = mid - 1;
            }
        }
        if (found >= 0) System.out.println(key + " is at index " + found);
        else System.out.println(key + " is not in the array");
    }
}
`, '10\n2 5 8 12 16 23 38 56 72 91\n23'],
['Algorithms, step by step', 'Tower of Hanoi', String.raw`import java.util.Scanner;

public class Main {
    static int moves = 0;

    // move n disks from 'from' to 'to', using 'via' as the spare peg
    static void hanoi(int n, char from, char to, char via) {
        if (n == 0) return;
        hanoi(n - 1, from, via, to);
        System.out.println("Move disk " + n + " from " + from + " to " + to);
        moves++;
        hanoi(n - 1, via, to, from);
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        hanoi(n, 'A', 'C', 'B');
        System.out.println("Total moves: " + moves + " (2^" + n + " - 1)");
    }
}
`, '3'],
['Algorithms, step by step', "Kadane's maximum subarray", String.raw`import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int[] a = new int[n];
        for (int i = 0; i < n; i++) a[i] = sc.nextInt();
        int cur = a[0], best = a[0], start = 0, bestStart = 0, bestEnd = 0;
        System.out.println("a[0] = " + a[0] + ": current = " + cur + ", best = " + best);
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
            System.out.println("a[" + i + "] = " + a[i] + ": current = " + cur + ", best = " + best);
        }
        System.out.print("Maximum subarray sum = " + best + ", from index " + bestStart + " to " + bestEnd + ": ");
        for (int i = bestStart; i <= bestEnd; i++) System.out.print(a[i] + " ");
        System.out.println();
    }
}
`, '9\n-2 1 -3 4 -1 2 1 -5 4'],
['Algorithms, step by step', 'BFS and DFS on a graph', String.raw`import java.util.*;

public class Main {
    static List<List<Integer>> adj = new ArrayList<>();
    static boolean[] visited;

    static void dfs(int u) {
        visited[u] = true;
        System.out.print(u + " ");
        for (int v : adj.get(u))
            if (!visited[v]) dfs(v);
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt(), m = sc.nextInt();     // vertices, edges
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int i = 0; i < m; i++) {
            int x = sc.nextInt(), y = sc.nextInt();
            adj.get(x).add(y);                      // undirected
            adj.get(y).add(x);
        }
        for (List<Integer> list : adj) Collections.sort(list);   // visit neighbours in increasing order
        int start = sc.nextInt();

        visited = new boolean[n];
        ArrayDeque<Integer> queue = new ArrayDeque<>();
        visited[start] = true;
        queue.add(start);
        System.out.println("BFS from " + start + ":");
        while (!queue.isEmpty()) {
            int u = queue.poll();
            for (int v : adj.get(u))
                if (!visited[v]) {
                    visited[v] = true;
                    queue.add(v);
                }
            System.out.print("visit " + u + ", queue: ");
            for (int x : queue) System.out.print(x + " ");
            System.out.println();
        }

        visited = new boolean[n];
        System.out.print("DFS from " + start + ": ");
        dfs(start);
        System.out.println();
    }
}
`, '6 7\n0 1\n0 2\n1 3\n2 4\n3 5\n4 5\n1 4\n0']
];
