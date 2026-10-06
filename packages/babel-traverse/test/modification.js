import vm from "node:vm";

import { parse } from "@babel/parser";
import * as t from "@babel/types";

import traverse from "../lib/index.js";
import generate from "@babel/generator";

function getPath(code, parserOpts) {
  const ast = parse(code, parserOpts);
  let path;
  traverse(ast, {
    Program: function (_path) {
      path = _path.get("body.0");
      _path.stop();
    },
  });

  return path;
}

function generateCode(path) {
  return generate(path.parentPath.node).code;
}

describe("modification", function () {
  describe("pushContainer", function () {
    it("pushes identifier into params", function () {
      const rootPath = getPath("function test(a) {}");
      rootPath.pushContainer("params", t.identifier("b"));

      expect(generateCode(rootPath)).toBe("function test(a, b) {}");
    });

    it("pushes identifier into block", function () {
      const rootPath = getPath("function test(a) {}");
      const path = rootPath.get("body");
      path.pushContainer("body", t.expressionStatement(t.identifier("b")));

      expect(generateCode(rootPath)).toBe("function test(a) {\n  b;\n}");
    });

    it("properly handles more than one arguments", function () {
      const code = "foo(a, b);";
      const ast = parse(code);
      traverse(ast, {
        CallExpression: function (path) {
          path.pushContainer("arguments", t.identifier("d"));
          expect(generateCode(path)).toBe("foo(a, b, d);");
          path.pushContainer("arguments", t.stringLiteral("s"));
          expect(generateCode(path)).toBe(`foo(a, b, d, "s");`);
        },
      });
    });

    it("should set the correct path.context", function () {
      expect.assertions(2);

      const ast = parse("[b];");
      traverse(ast, {
        skipKeys: ["consequent"],
        ExpressionStatement(path) {
          path.traverse({ Identifier() {}, skipKeys: [] });

          const arr = path.get("expression");
          const x = arr.pushContainer("elements", [
            { type: "Identifier", name: "x" },
          ])[0];

          expect(x.node.name).toBe("x");
          expect(x.opts.skipKeys).toEqual(["consequent"]);
        },
      });
    });
  });
  describe("unshiftContainer", function () {
    it("unshifts identifier into params", function () {
      const rootPath = getPath("function test(a) {}");
      rootPath.unshiftContainer("params", t.identifier("b"));

      expect(generateCode(rootPath)).toBe("function test(b, a) {}");
    });

    it("unshifts identifier into block", function () {
      const rootPath = getPath("function test(a) {}");
      const path = rootPath.get("body");
      path.unshiftContainer("body", t.expressionStatement(t.identifier("b")));

      expect(generateCode(rootPath)).toBe("function test(a) {\n  b;\n}");
    });

    it("properly handles more than one arguments", function () {
      const code = "foo(a, b);";
      const ast = parse(code);
      traverse(ast, {
        CallExpression: function (path) {
          path.unshiftContainer("arguments", t.identifier("d"));
          expect(generateCode(path)).toBe("foo(d, a, b);");
          path.unshiftContainer("arguments", t.stringLiteral("s"));
          expect(generateCode(path)).toBe(`foo("s", d, a, b);`);
        },
      });
    });

    it("should set the correct path.context", function () {
      expect.assertions(2);

      const ast = parse("[b];");
      traverse(ast, {
        skipKeys: ["consequent"],
        ExpressionStatement(path) {
          path.traverse({ Identifier() {}, skipKeys: [] });

          const arr = path.get("expression");
          const x = arr.unshiftContainer("elements", [
            { type: "Identifier", name: "x" },
          ])[0];

          expect(x.node.name).toBe("x");
          expect(x.opts.skipKeys).toEqual(["consequent"]);
        },
      });
    });
  });

  describe("insertBefore", function () {
    it("returns inserted path with BlockStatement", function () {
      const rootPath = getPath("if (x) { y; }");
      const path = rootPath.get("consequent.body.0");
      const result = path.insertBefore(t.identifier("b"));

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0].node).toEqual(t.identifier("b"));
      expect(generateCode(rootPath)).toBe("if (x) {\n  b\n  y;\n}");
    });

    it("returns inserted path without BlockStatement", function () {
      const rootPath = getPath("if (x) y;");
      const path = rootPath.get("consequent");
      const result = path.insertBefore(t.identifier("b"));

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0].node).toEqual(t.identifier("b"));
      expect(generateCode(rootPath)).toBe("if (x) {\n  b\n  y;\n}");
    });

    it("returns inserted path without BlockStatement without ExpressionStatement", function () {
      const rootPath = getPath("if (x) for (var i = 0; i < 0; i++) {}");
      const path = rootPath.get("consequent");
      const result = path.insertBefore(t.identifier("b"));

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[result.length - 1].node).toEqual(t.identifier("b"));
      expect(generateCode(rootPath)).toBe(
        "if (x) {\n  b\n  for (var i = 0; i < 0; i++) {}\n}",
      );
    });

    it("returns inserted path with BlockStatement without ExpressionStatement", function () {
      const rootPath = getPath("if (x) { for (var i = 0; i < 0; i++) {} }");
      const path = rootPath.get("consequent.body.0");
      const result = path.insertBefore(t.identifier("b"));

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[result.length - 1].node).toEqual(t.identifier("b"));
      expect(generateCode(rootPath)).toBe(
        "if (x) {\n  b\n  for (var i = 0; i < 0; i++) {}\n}",
      );
    });

    it("returns inserted path with nested JSXElement", function () {
      const ast = parse("<div><span>foo</span></div>", {
        plugins: ["jsx"],
      });
      let path;
      traverse(ast, {
        Program: function (_path) {
          path = _path.get("body.0");
        },
        JSXElement: function (path) {
          const tagName = path.node.openingElement.name.name;
          if (tagName !== "span") return;
          path.insertBefore(
            t.jsxElement(
              t.jsxOpeningElement(t.jsxIdentifier("div"), [], false),
              t.jsxClosingElement(t.jsxIdentifier("div")),
              [],
            ),
          );
        },
      });
      expect(generateCode(path)).toBe(
        "<div><div></div><span>foo</span></div>;",
      );
    });

    describe("when the parent is an export declaration inserts the node before", function () {
      it("the ExportNamedDeclaration", function () {
        const bodyPath = getPath("export function a() {}", {
          sourceType: "module",
        }).parentPath;
        const fnPath = bodyPath.get("body.0.declaration");
        fnPath.insertBefore(t.identifier("x"));

        expect(bodyPath.get("body")).toHaveLength(2);
        expect(bodyPath.get("body.0").node).toEqual(t.identifier("x"));
      });

      it("the ExportDefaultDeclaration, if a declaration is exported", function () {
        const bodyPath = getPath("export default function () {}", {
          sourceType: "module",
        }).parentPath;
        const fnPath = bodyPath.get("body.0.declaration");
        fnPath.insertBefore(t.identifier("x"));

        expect(bodyPath.get("body")).toHaveLength(2);
        expect(bodyPath.get("body.0").node).toEqual(t.identifier("x"));
      });

      it("the exported expression", function () {
        const declPath = getPath("export default fn();", {
          sourceType: "module",
        });
        const path = declPath.get("declaration");
        path.insertBefore(t.identifier("x"));

        expect(generateCode(declPath)).toBe("export default (x, fn());");
      });
    });
  });

  describe("insertAfter", function () {
    it.each(["() => 1", "function(){return 1}", "class {}"])(
      "stores the result of %s in its evaluation scope",
      expression => {
        const ast = parse(
          `let hits=0;const value=(${expression});return [typeof value,hits];`,
          { allowReturnOutsideFunction: true },
        );
        let target;
        traverse(ast, {
          VariableDeclarator(path) {
            if (t.isIdentifier(path.node.id, { name: "value" }))
              target = path.get("init");
          },
        });
        target.insertAfter(
          t.expressionStatement(t.updateExpression("++", t.identifier("hits"))),
        );
        expect(Function(`"use strict";${generate(ast).code}`)()).toEqual([
          "function",
          1,
        ]);
      },
    );

    it.each([
      ["public object", "class C { x = {}; }", "value", "outer.x !== inner.x"],
      [
        "public call",
        "function make(){return {}} class C { x = make(); }",
        "value",
        "outer.x !== inner.x",
      ],
      [
        "private object",
        "class C { #value = {}; get x(){return this.#value} }",
        "value",
        "outer.x !== inner.x",
      ],
      [
        "nested expression",
        "class C { x = [{}]; }",
        "value.elements.0",
        "outer.x[0] !== inner.x[0]",
      ],
      [
        "lexical this",
        "class C { x = this; }",
        "value",
        "outer.x === outer && inner.x === inner",
      ],
      [
        "lexical super",
        "class B {get value(){return this}} class C extends B { x = super.value; }",
        "value",
        "outer.x === outer && inner.x === inner",
      ],
      [
        "nested function",
        "class C { x = (() => ({}))(); }",
        "value.callee.body",
        "outer.x !== inner.x",
      ],
      [
        "whole arrow function",
        "class C { x = () => 1; }",
        "value",
        "outer.x !== inner.x && outer.x() === 1",
      ],
      [
        "whole function",
        "class C { x = function(){return 1}; }",
        "value",
        "outer.x !== inner.x && outer.x() === 1",
      ],
      [
        "whole class",
        "class C { x = class {}; }",
        "value",
        "outer.x !== inner.x",
      ],
      [
        "nested class computed method key",
        "class C { x = class { [{name:busy?'inner':'outer',[Symbol.toPrimitive](){return this.name}}](){} }; }",
        "value.body.body.0.key",
        "Object.hasOwn(outer.x.prototype,'outer') && Object.hasOwn(inner.x.prototype,'inner')",
      ],
    ])(
      "keeps %s initializer values local during reentry",
      (_label, declaration, selector, expected) => {
        const ast = parse(
          `let inner, busy=false; function after(){if(!busy){busy=true;inner=new C();busy=false}} ${declaration} const outer=new C(); globalThis.observed=(${expected});`,
        );
        let target;
        traverse(ast, {
          "ClassProperty|ClassPrivateProperty"(path) {
            target = path.get(selector);
          },
        });
        target.insertAfter(
          t.expressionStatement(t.callExpression(t.identifier("after"), [])),
        );
        const context = {};
        vm.runInNewContext(generate(ast).code, context, { timeout: 100 });
        expect(context.observed).toBe(true);
      },
    );

    it("keeps private field initialization and brands in order during reentry", () => {
      const ast = parse(
        `let inner,busy=false;const log=[];function after(value){log.push(value.probe());if(!busy){busy=true;inner=new C();busy=false}}class C{#first=1;#second={};probe(){return [this.#first,#second in this]}get value(){return this.#second}}const outer=new C();globalThis.observed={same:outer.value===inner.value,log};`,
      );
      let target;
      traverse(ast, {
        ClassPrivateProperty(path) {
          if (path.node.key.id.name === "second") target = path.get("value");
        },
      });
      target.insertAfter(
        t.expressionStatement(
          t.callExpression(t.identifier("after"), [t.thisExpression()]),
        ),
      );
      const context = {};
      vm.runInNewContext(generate(ast).code, context, { timeout: 100 });
      expect(JSON.parse(JSON.stringify(context.observed))).toEqual({
        same: false,
        log: [
          [1, false],
          [1, false],
        ],
      });
    });

    it("gives auto-accessor initializers an invocation-local temporary", () => {
      const ast = parse(`class C {accessor x={}}`, {
        plugins: ["decoratorAutoAccessors"],
      });
      let target;
      traverse(ast, {
        ClassAccessorProperty(path) {
          target = path.get("value");
        },
      });
      target.insertAfter(
        t.expressionStatement(t.callExpression(t.identifier("after"), [])),
      );
      expect(target.isCallExpression()).toBe(true);
      expect(target.get("callee").isArrowFunctionExpression()).toBe(true);
      expect(ast.program.body.some(node => t.isVariableDeclaration(node))).toBe(
        false,
      );
    });

    it("preserves static initializer evaluation during nested class creation", () => {
      const ast = parse(
        `let inner,busy=false;function after(){if(!busy){busy=true;inner=create();busy=false}} function create(){return class C {static x={};static self=this}} const outer=create();globalThis.observed=outer.x!==inner.x&&outer.self===outer&&inner.self===inner;`,
      );
      const targets = [];
      traverse(ast, {
        ClassProperty(path) {
          targets.push(path.get("value"));
        },
      });
      for (const target of targets)
        target.insertAfter(
          t.expressionStatement(t.callExpression(t.identifier("after"), [])),
        );
      const context = {};
      vm.runInNewContext(generate(ast).code, context, { timeout: 100 });
      expect(context.observed).toBe(true);
    });

    it.each([
      [
        "value + 1",
        "const value = { valueOf() { log.push('coerce'); return 2; } };",
        ["coerce", "after"],
        3,
      ],
      [
        "`${value}`",
        "const value = { toString() { log.push('coerce'); return 'key'; } };",
        ["coerce", "after"],
        "key",
      ],
      [
        "({[value]: 1})",
        "const value = { toString() { log.push('coerce'); return 'key'; } };",
        ["coerce", "after"],
        { key: 1 },
      ],
      ["+value", "const value = 1n;", ["TypeError"], undefined],
      [
        "`${value}`",
        "const value = Symbol.iterator;",
        ["TypeError"],
        undefined,
      ],
    ])(
      "preserves effects and abrupt completion of %s",
      (expression, setup, expectedLog, expectedValue) => {
        const ast = parse(
          `const log = []; ${setup} let result; try { result = (${expression}); } catch (error) { log.push(error.name); } globalThis.observed = {log, result};`,
        );
        let target;
        traverse(ast, {
          AssignmentExpression(path) {
            if (t.isIdentifier(path.node.left, { name: "result" }))
              target = path.get("right");
          },
        });
        target.insertAfter(
          t.expressionStatement(
            t.callExpression(
              t.memberExpression(t.identifier("log"), t.identifier("push")),
              [t.stringLiteral("after")],
            ),
          ),
        );
        const context = {};
        vm.runInNewContext(generate(ast).code, context, { timeout: 100 });
        expect(JSON.parse(JSON.stringify(context.observed.log))).toEqual(
          expectedLog,
        );
        expect(
          context.observed.result === undefined
            ? undefined
            : JSON.parse(JSON.stringify(context.observed.result)),
        ).toEqual(expectedValue);
      },
    );

    it("returns inserted path with BlockStatement with ExpressionStatement", function () {
      const rootPath = getPath("if (x) { y; }");
      const path = rootPath.get("consequent.body.0");
      const result = path.insertAfter(t.identifier("b"));

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[result.length - 1].node).toEqual(t.identifier("b"));
      expect(generateCode(rootPath)).toBe("if (x) {\n  y;\n  b\n}");
    });

    it("returns inserted path without BlockStatement with ExpressionStatement", function () {
      const rootPath = getPath("if (x) y;");
      const path = rootPath.get("consequent");
      const result = path.insertAfter(t.identifier("b"));

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[result.length - 1].node).toEqual(t.identifier("b"));
      expect(generateCode(rootPath)).toBe("if (x) {\n  y;\n  b\n}");
    });

    it("returns inserted path without BlockStatement without ExpressionStatement", function () {
      const rootPath = getPath("if (x) for (var i = 0; i < 0; i++) {}");
      const path = rootPath.get("consequent");
      const result = path.insertAfter(t.identifier("b"));

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[result.length - 1].node).toEqual(t.identifier("b"));
      expect(generateCode(rootPath)).toBe(
        "if (x) {\n  for (var i = 0; i < 0; i++) {}\n  b\n}",
      );
    });

    it("returns inserted path with BlockStatement without ExpressionStatement", function () {
      const rootPath = getPath("if (x) { for (var i = 0; i < 0; i++) {} }");
      const path = rootPath.get("consequent.body.0");
      const result = path.insertAfter(t.identifier("b"));

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[result.length - 1].node).toEqual(t.identifier("b"));
      expect(generateCode(rootPath)).toBe(
        "if (x) {\n  for (var i = 0; i < 0; i++) {}\n  b\n}",
      );
    });

    it("returns inserted path with nested JSXElement", function () {
      const ast = parse("<div><span>foo</span></div>", {
        plugins: ["jsx"],
      });
      let path;
      traverse(ast, {
        Program: function (_path) {
          path = _path.get("body.0");
        },
        JSXElement: function (path) {
          const tagName = path.node.openingElement.name.name;
          if (tagName !== "span") return;
          path.insertAfter(
            t.jsxElement(
              t.jsxOpeningElement(t.jsxIdentifier("div"), [], false),
              t.jsxClosingElement(t.jsxIdentifier("div")),
              [],
            ),
          );
        },
      });
      expect(generateCode(path)).toBe(
        "<div><span>foo</span><div></div></div>;",
      );
    });

    describe("when the parent is an export declaration inserts the node after", function () {
      it("the ExportNamedDeclaration", function () {
        const bodyPath = getPath("export function a() {}", {
          sourceType: "module",
        }).parentPath;
        const fnPath = bodyPath.get("body.0.declaration");
        fnPath.insertAfter(t.identifier("x"));

        expect(bodyPath.get("body")).toHaveLength(2);
        expect(bodyPath.get("body.1").node).toEqual(
          t.expressionStatement(t.identifier("x")),
        );
      });

      it("the ExportDefaultDeclaration, if a declaration is exported", function () {
        const bodyPath = getPath("export default function () {}", {
          sourceType: "module",
        }).parentPath;
        const fnPath = bodyPath.get("body.0.declaration");
        fnPath.insertAfter(t.identifier("x"));

        expect(bodyPath.get("body")).toHaveLength(2);
        expect(bodyPath.get("body.1").node).toEqual(
          t.expressionStatement(t.identifier("x")),
        );
      });

      it("the exported expression", function () {
        const bodyPath = getPath("export default fn();", {
          sourceType: "module",
        }).parentPath;
        const path = bodyPath.get("body.0.declaration");
        path.insertAfter(t.identifier("x"));

        expect(generateCode({ parentPath: bodyPath })).toBe(
          "var _temp;\nexport default (_temp = fn(), x, _temp);",
        );
      });

      it("edge case for babel-plugin-jest-hoist", function () {
        let varsHoistPoint;
        let i = 0;
        const logs = [[], []];
        traverse(parse(`{a;}`), {
          BlockStatement(path) {
            [varsHoistPoint] = path.unshiftContainer(
              "body",
              t.emptyStatement(),
            );
            path.traverse({
              Identifier(path) {
                if (i++ >= 5) {
                  return;
                }
                logs[0].push(path.node.name);
                varsHoistPoint.insertBefore(t.identifier("b"));
              },
            });
          },
        });
        i = 0;
        traverse(parse(`{a;}`), {
          BlockStatement(path) {
            [varsHoistPoint] = path.unshiftContainer(
              "body",
              t.emptyStatement(),
            );
            path.traverse({
              enter() {},
              Identifier(path) {
                if (i++ >= 5) {
                  return;
                }
                logs[1].push(path.node.name);
                varsHoistPoint.insertBefore(t.identifier("b"));
              },
            });
          },
        });

        expect(logs[0]).toEqual(["a", "b", "b", "b", "b"]);
        expect(logs[1]).toEqual(["a", "b", "b", "b", "b"]);
      });
    });
  });
});
