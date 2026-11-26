// Examples with several files: [group, name, main code, input, [[file name, code], ...]].
// Classes live in their own files and inherit from each other; main uses them. (C: a module in a .h/.c pair.)
window.MORE_EXAMPLES = window.MORE_EXAMPLES || {};
(() => {
  const G = 'Classes in several files (OOP)';
  const add = (lang, list) => { (MORE_EXAMPLES[lang] = MORE_EXAMPLES[lang] || []).push(...list.map(e => [G, ...e])); };

  add('cpp', [
    ['Shapes: base class and subclasses', `#include <iostream>
#include <memory>
#include <vector>
#include "circle.h"
#include "rectangle.h"
using namespace std;

int main() {
    vector<unique_ptr<Shape>> shapes;
    shapes.push_back(make_unique<Circle>(1.5));
    shapes.push_back(make_unique<Rectangle>(3, 4));
    shapes.push_back(make_unique<Square>(2));

    double total = 0;
    for (const auto& s : shapes) {
        s->describe();          // virtual: each class prints itself
        total += s->area();
    }
    cout << "total area = " << total << "\\n";
    return 0;
}
`, '', [
      ['shape.h', `#pragma once
#include <string>

// The base class: every shape has a name, an area and a way to describe itself
class Shape {
public:
    explicit Shape(std::string name) : name_(std::move(name)) {}
    virtual ~Shape() = default;
    virtual double area() const = 0;      // each subclass must define this
    virtual void describe() const;        // subclasses may override this
    const std::string& name() const { return name_; }
private:
    std::string name_;
};
`],
      ['shape.cpp', `#include "shape.h"
#include <iostream>

void Shape::describe() const {
    std::cout << name() << " with area " << area() << "\\n";
}
`],
      ['circle.h', `#pragma once
#include "shape.h"

class Circle : public Shape {
public:
    explicit Circle(double r) : Shape("circle"), r_(r) {}
    double area() const override { return 3.14159265 * r_ * r_; }
private:
    double r_;
};
`],
      ['rectangle.h', `#pragma once
#include "shape.h"

class Rectangle : public Shape {
public:
    Rectangle(double w, double h) : Shape("rectangle"), w_(w), h_(h) {}
    double area() const override { return w_ * h_; }
    void describe() const override;       // defined in rectangle.cpp
protected:
    Rectangle(const char* name, double w, double h) : Shape(name), w_(w), h_(h) {}
    double w_, h_;
};

// A square is a rectangle with equal sides
class Square : public Rectangle {
public:
    explicit Square(double side) : Rectangle("square", side, side) {}
};
`],
      ['rectangle.cpp', `#include "rectangle.h"
#include <iostream>

void Rectangle::describe() const {
    std::cout << name() << " " << w_ << " x " << h_ << " with area " << area() << "\\n";
}
`]
    ]]
  ]);

  add('java', [
    ['Shapes: base class and subclasses', `import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<Shape> shapes = new ArrayList<>();
        shapes.add(new Circle(1.5));
        shapes.add(new Rectangle(3, 4));
        shapes.add(new Square(2));

        double total = 0;
        for (Shape s : shapes) {
            s.describe();          // each class describes itself
            total += s.area();
        }
        System.out.printf("total area = %.2f%n", total);
    }
}
`, '', [
      ['Shape.java', `// The base class: every shape has a name and an area
public abstract class Shape {
    private final String name;

    protected Shape(String name) { this.name = name; }

    public String getName() { return name; }

    public abstract double area();          // each subclass must define this

    public void describe() {                // subclasses may override this
        System.out.printf("%s with area %.2f%n", name, area());
    }
}
`],
      ['Circle.java', `public class Circle extends Shape {
    private final double r;

    public Circle(double r) { super("circle"); this.r = r; }

    @Override
    public double area() { return Math.PI * r * r; }
}
`],
      ['Rectangle.java', `public class Rectangle extends Shape {
    protected final double w, h;

    public Rectangle(double w, double h) { this("rectangle", w, h); }

    protected Rectangle(String name, double w, double h) { super(name); this.w = w; this.h = h; }

    @Override
    public double area() { return w * h; }

    @Override
    public void describe() {
        System.out.printf("%s %.0f x %.0f with area %.2f%n", getName(), w, h, area());
    }
}
`],
      ['Square.java', `// A square is a rectangle with equal sides
public class Square extends Rectangle {
    public Square(double side) { super("square", side, side); }
}
`]
    ]]
  ]);

  add('python', [
    ['Shapes: base class and subclasses', `from shapes import Circle, Rectangle, Square

shapes = [Circle(1.5), Rectangle(3, 4), Square(2)]

total = 0
for s in shapes:
    s.describe()          # each class describes itself
    total += s.area()
print(f"total area = {total:.2f}")
`, '', [
      ['shape.py', `from abc import ABC, abstractmethod


class Shape(ABC):
    """The base class: every shape has a name and an area."""

    def __init__(self, name):
        self.name = name

    @abstractmethod
    def area(self):
        """Each subclass must define this."""

    def describe(self):
        print(f"{self.name} with area {self.area():.2f}")
`],
      ['shapes.py', `import math
from shape import Shape


class Circle(Shape):
    def __init__(self, r):
        super().__init__("circle")
        self.r = r

    def area(self):
        return math.pi * self.r ** 2


class Rectangle(Shape):
    def __init__(self, w, h, name="rectangle"):
        super().__init__(name)
        self.w, self.h = w, h

    def area(self):
        return self.w * self.h

    def describe(self):
        print(f"{self.name} {self.w} x {self.h} with area {self.area():.2f}")


class Square(Rectangle):
    """A square is a rectangle with equal sides."""

    def __init__(self, side):
        super().__init__(side, side, "square")
`]
    ]]
  ]);

  add('c', [
    ['A module in a header and a source file', `#include <stdio.h>
#include "stack.h"

int main(void) {
    Stack s;
    stack_init(&s);
    for (int i = 1; i <= 5; i++) stack_push(&s, i * i);
    printf("size %d, top %d\\n", stack_size(&s), stack_top(&s));
    while (!stack_empty(&s)) printf("pop %d\\n", stack_pop(&s));
    return 0;
}
`, '', [
      ['stack.h', `#ifndef STACK_H
#define STACK_H

/* A stack of ints: the type and the functions that work on it */
#define STACK_MAX 100

typedef struct {
    int items[STACK_MAX];
    int count;
} Stack;

void stack_init(Stack *s);
void stack_push(Stack *s, int x);
int  stack_pop(Stack *s);
int  stack_top(const Stack *s);
int  stack_size(const Stack *s);
int  stack_empty(const Stack *s);

#endif
`],
      ['stack.c', `#include "stack.h"

void stack_init(Stack *s) { s->count = 0; }
void stack_push(Stack *s, int x) { if (s->count < STACK_MAX) s->items[s->count++] = x; }
int  stack_pop(Stack *s) { return s->count ? s->items[--s->count] : -1; }
int  stack_top(const Stack *s) { return s->count ? s->items[s->count - 1] : -1; }
int  stack_size(const Stack *s) { return s->count; }
int  stack_empty(const Stack *s) { return s->count == 0; }
`]
    ]]
  ]);
})();
