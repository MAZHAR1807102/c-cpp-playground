// Example projects for the Verilog page: { name, files: [[filename, code]] }. Projects without a testbench are
// driven automatically (every input combination, or a clock and reset); the others bring their own testbench.
window.VERILOG_EXAMPLES = [
  { name: 'Full adder from half adders (multi-module)', files: [
    ['half_adder.v', `// A half adder adds two bits: sum = a XOR b, carry = a AND b
module half_adder (
    input  wire a,
    input  wire b,
    output wire sum,
    output wire carry
);
    assign sum   = a ^ b;
    assign carry = a & b;
endmodule
`],
    ['full_adder.v', `// A full adder built from two half adders and an OR gate
module full_adder (
    input  wire a,
    input  wire b,
    input  wire cin,
    output wire sum,
    output wire cout
);
    wire s1, c1, c2;

    half_adder ha1 (.a(a),  .b(b),   .sum(s1),  .carry(c1));
    half_adder ha2 (.a(s1), .b(cin), .sum(sum), .carry(c2));

    assign cout = c1 | c2;
endmodule
`],
    ['adder4.v', `// A 4-bit ripple-carry adder: four full adders, each carry feeds the next
module adder4 (
    input  wire [3:0] a,
    input  wire [3:0] b,
    input  wire       cin,
    output wire [3:0] sum,
    output wire       cout
);
    wire c1, c2, c3;

    full_adder fa0 (.a(a[0]), .b(b[0]), .cin(cin), .sum(sum[0]), .cout(c1));
    full_adder fa1 (.a(a[1]), .b(b[1]), .cin(c1),  .sum(sum[1]), .cout(c2));
    full_adder fa2 (.a(a[2]), .b(b[2]), .cin(c2),  .sum(sum[2]), .cout(c3));
    full_adder fa3 (.a(a[3]), .b(b[3]), .cin(c3),  .sum(sum[3]), .cout(cout));
endmodule
`]] },

  { name: '4-bit counter with a testbench', files: [
    ['counter.v', `// A 4-bit up counter with synchronous reset and enable
module counter (
    input  wire       clk,
    input  wire       rst,
    input  wire       en,
    output reg  [3:0] q
);
    always @(posedge clk) begin
        if (rst)
            q <= 4'd0;
        else if (en)
            q <= q + 4'd1;
    end
endmodule
`],
    ['counter_tb.v', `\`timescale 1ns/1ps
// The testbench: makes a clock, resets the counter, then lets it count (with a pause)
module counter_tb;
    reg clk = 0, rst = 1, en = 0;
    wire [3:0] q;

    counter dut (.clk(clk), .rst(rst), .en(en), .q(q));

    always #5 clk = ~clk;          // a 10 ns clock

    initial begin
        $dumpfile("wave.vcd");
        $dumpvars(0, counter_tb);
        $monitor("t=%0t  rst=%b en=%b  q=%d", $time, rst, en, q);
        #12 rst = 0; en = 1;
        #100 en = 0;               // pause
        #30 en = 1;
        #60 $finish;
    end
endmodule
`]] },

  { name: 'Multiplexers (2:1 and 4:1)', files: [
    ['mux.v', `// A 2-to-1 multiplexer: y = s ? b : a
module mux2 (
    input  wire a,
    input  wire b,
    input  wire s,
    output wire y
);
    assign y = s ? b : a;
endmodule

// A 4-to-1 multiplexer made of three 2-to-1 multiplexers
module mux4 (
    input  wire [3:0] d,
    input  wire [1:0] sel,
    output wire       y
);
    wire lo, hi;
    mux2 m0 (.a(d[0]), .b(d[1]), .s(sel[0]), .y(lo));
    mux2 m1 (.a(d[2]), .b(d[3]), .s(sel[0]), .y(hi));
    mux2 m2 (.a(lo),   .b(hi),   .s(sel[1]), .y(y));
endmodule
`]] },

  { name: '3-to-8 decoder and priority encoder', files: [
    ['decoder.v', `// 3-to-8 decoder: exactly one output is 1 when enabled
module decoder3to8 (
    input  wire [2:0] a,
    input  wire       en,
    output reg  [7:0] y
);
    always @(*) begin
        y = 8'b0;
        if (en) y[a] = 1'b1;
    end
endmodule

// 4-to-2 priority encoder: the highest set input wins; valid = any input set
module priority_encoder (
    input  wire [3:0] d,
    output reg  [1:0] y,
    output wire       valid
);
    assign valid = |d;
    always @(*) begin
        casez (d)
            4'b1???: y = 2'd3;
            4'b01??: y = 2'd2;
            4'b001?: y = 2'd1;
            default: y = 2'd0;
        endcase
    end
endmodule
`]] },

  { name: 'Traffic light (state machine)', files: [
    ['traffic.v', `// A traffic light: green 4 ticks, yellow 2 ticks, red 4 ticks, then again
module traffic_light (
    input  wire       clk,
    input  wire       rst,
    output reg  [2:0] light      // {red, yellow, green}
);
    localparam GREEN = 2'd0, YELLOW = 2'd1, RED = 2'd2;
    reg [1:0] state;
    reg [2:0] timer;

    always @(posedge clk) begin
        if (rst) begin
            state <= GREEN; timer <= 0;
        end else begin
            timer <= timer + 1;
            case (state)
                GREEN:  if (timer == 3) begin state <= YELLOW; timer <= 0; end
                YELLOW: if (timer == 1) begin state <= RED;    timer <= 0; end
                RED:    if (timer == 3) begin state <= GREEN;  timer <= 0; end
                default: state <= GREEN;
            endcase
        end
    end

    always @(*) begin
        case (state)
            GREEN:   light = 3'b001;
            YELLOW:  light = 3'b010;
            RED:     light = 3'b100;
            default: light = 3'b000;
        endcase
    end
endmodule
`],
    ['traffic_tb.v', `\`timescale 1ns/1ps
module traffic_tb;
    reg clk = 0, rst = 1;
    wire [2:0] light;
    traffic_light dut (.clk(clk), .rst(rst), .light(light));
    always #5 clk = ~clk;
    initial begin
        $dumpfile("wave.vcd");
        $dumpvars(0, traffic_tb);
        #12 rst = 0;
        repeat (24) begin
            @(posedge clk); #1;
            $display("t=%0t  state=%0d  light(R Y G)=%b", $time, dut.state, light);
        end
        $finish;
    end
endmodule
`]] },

  { name: 'Shift register and D flip-flop', files: [
    ['dff.v', `// A D flip-flop with asynchronous active-low reset
module dff (
    input  wire clk,
    input  wire rst_n,
    input  wire d,
    output reg  q
);
    always @(posedge clk or negedge rst_n)
        if (!rst_n) q <= 1'b0;
        else        q <= d;
endmodule

// A 4-bit serial-in, parallel-out shift register made of four flip-flops
module shift4 (
    input  wire       clk,
    input  wire       rst_n,
    input  wire       din,
    output wire [3:0] q
);
    dff f0 (.clk(clk), .rst_n(rst_n), .d(din),  .q(q[0]));
    dff f1 (.clk(clk), .rst_n(rst_n), .d(q[0]), .q(q[1]));
    dff f2 (.clk(clk), .rst_n(rst_n), .d(q[1]), .q(q[2]));
    dff f3 (.clk(clk), .rst_n(rst_n), .d(q[2]), .q(q[3]));
endmodule
`]] },

  { name: '4-bit ALU with a testbench', files: [
    ['alu.v', `// A small ALU: op selects add, subtract, AND, OR, XOR, shift left, compare
module alu (
    input  wire [3:0] a,
    input  wire [3:0] b,
    input  wire [2:0] op,
    output reg  [3:0] y,
    output wire       zero
);
    always @(*) begin
        case (op)
            3'd0: y = a + b;
            3'd1: y = a - b;
            3'd2: y = a & b;
            3'd3: y = a | b;
            3'd4: y = a ^ b;
            3'd5: y = a << 1;
            3'd6: y = (a < b) ? 4'd1 : 4'd0;
            default: y = 4'd0;
        endcase
    end
    assign zero = (y == 4'd0);
endmodule
`],
    ['alu_tb.v', `\`timescale 1ns/1ps
module alu_tb;
    reg  [3:0] a, b;
    reg  [2:0] op;
    wire [3:0] y;
    wire zero;
    integer i;
    alu dut (.a(a), .b(b), .op(op), .y(y), .zero(zero));
    initial begin
        $dumpfile("wave.vcd");
        $dumpvars(0, alu_tb);
        a = 4'd6; b = 4'd3;
        for (i = 0; i < 7; i = i + 1) begin
            op = i; #10;
            $display("op=%0d  a=%0d b=%0d  ->  y=%0d zero=%b", op, a, b, y, zero);
        end
        $finish;
    end
endmodule
`]] },

  { name: 'Empty project', files: [['main.v', `// Write a module here. Its waveform, truth table and circuit appear on the right as you type.
module my_gate (
    input  wire a,
    input  wire b,
    output wire y
);
    assign y = a & b;
endmodule
`]] }
];
