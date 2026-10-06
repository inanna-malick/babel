import * as t from "../lib/index.js";
import { parse } from "@babel/parser";
import generate from "@babel/generator";

describe("cloneNode", function () {
  it("should handle undefined", function () {
    const node = undefined;
    const cloned = t.cloneNode(node);
    expect(cloned).toBeUndefined();
  });

  it("should handle null", function () {
    const node = null;
    const cloned = t.cloneNode(node);
    expect(cloned).toBeNull();
  });

  it("should handle simple cases", function () {
    const node = t.identifier("a");
    const cloned = t.cloneNode(node);
    expect(node).not.toBe(cloned);
    expect(t.isNodesEquivalent(node, cloned)).toBe(true);
  });

  it("should handle full programs", function () {
    const file = parse("1 + 1");
    const cloned = t.cloneNode(file);
    expect(file).not.toBe(cloned);
    expect(file.program.body[0].expression.right).not.toBe(
      cloned.program.body[0].expression.right,
    );
    expect(file.program.body[0].expression.left).not.toBe(
      cloned.program.body[0].expression.left,
    );
    expect(t.isNodesEquivalent(file, cloned)).toBe(true);
  });

  it("should handle complex programs", function () {
    const program = "'use strict'; function lol() { wow();return 1; }";
    const node = parse(program);
    const cloned = t.cloneNode(node);
    expect(node).not.toBe(cloned);
    expect(t.isNodesEquivalent(node, cloned)).toBe(true);
  });

  it("should handle deep cloning without loc of fragments", function () {
    const program = "foo();";
    const node = parse(program);
    const cloned = t.cloneNode(node, /* deep */ true, /* withoutLoc */ true);
    expect(node).not.toBe(cloned);
    expect(t.isNodesEquivalent(node, cloned)).toBe(true);
  });

  it("should handle missing array element", function () {
    const node = parse("[,0]");
    const cloned = t.cloneNode(node);
    expect(node).not.toBe(cloned);
    expect(t.isNodesEquivalent(node, cloned)).toBe(true);
  });

  it("should support shallow cloning", function () {
    const node = t.memberExpression(t.identifier("foo"), t.identifier("bar"));
    const cloned = t.cloneNode(node, /* deep */ false);
    expect(node).not.toBe(cloned);
    expect(node.object).toBe(cloned.object);
    expect(node.property).toBe(cloned.property);
  });

  it("should preserve type annotations", function () {
    const node = t.variableDeclaration("let", [
      t.variableDeclarator({
        ...t.identifier("value"),
        typeAnnotation: t.anyTypeAnnotation(),
      }),
    ]);
    const cloned = t.cloneNode(node, /* deep */ true);
    expect(cloned.declarations[0].id.typeAnnotation).toEqual(
      node.declarations[0].id.typeAnnotation,
    );
    expect(cloned.declarations[0].id.typeAnnotation).not.toBe(
      node.declarations[0].id.typeAnnotation,
    );
  });

  it("should support shallow cloning without loc", function () {
    const node = t.variableDeclaration("let", [
      t.variableDeclarator({
        ...t.identifier("value"),
        typeAnnotation: t.anyTypeAnnotation(),
      }),
    ]);
    node.loc = {};
    const cloned = t.cloneNode(node, /* deep */ false, /* withoutLoc */ true);
    expect(cloned.loc).toBeNull();
  });

  it("should support deep cloning without loc", function () {
    const node = t.variableDeclaration("let", [
      t.variableDeclarator({
        ...t.identifier("value"),
        typeAnnotation: t.anyTypeAnnotation(),
      }),
    ]);
    node.loc = {};
    node.declarations[0].id.loc = {};
    const cloned = t.cloneNode(node, /* deep */ true, /* withoutLoc */ true);
    expect(cloned.loc).toBeNull();
    expect(cloned.declarations[0].id.loc).toBeNull();
  });

  it("should support deep cloning for comments", function () {
    const node = t.variableDeclaration("let", [
      t.variableDeclarator({
        ...t.identifier("value"),
        leadingComments: [{ loc: {} }],
        innerComments: [{ loc: {} }],
        trailingComments: [{ loc: {} }],
      }),
    ]);
    node.loc = {};
    node.declarations[0].id.loc = {};

    const cloned = t.cloneNode(node, /* deep */ true, /* withoutLoc */ false);
    expect(cloned.declarations[0].id.leadingComments[0]).not.toBe(
      node.declarations[0].id.leadingComments[0],
    );
    expect(cloned.declarations[0].id.leadingComments[0].loc).toBe(
      node.declarations[0].id.leadingComments[0].loc,
    );
    expect(cloned.declarations[0].id.innerComments[0].loc).toBe(
      node.declarations[0].id.innerComments[0].loc,
    );
    expect(cloned.declarations[0].id.trailingComments[0].loc).toBe(
      node.declarations[0].id.trailingComments[0].loc,
    );
  });

  it("should support deep cloning for comments without loc", function () {
    const node = t.variableDeclaration("let", [
      t.variableDeclarator({
        ...t.identifier("value"),
        leadingComments: [{ loc: {} }],
        innerComments: [{ loc: {} }],
        trailingComments: [{ loc: {} }],
      }),
    ]);
    node.loc = {};
    node.declarations[0].id.loc = {};

    const cloned = t.cloneNode(node, /* deep */ true, /* withoutLoc */ true);
    expect(cloned.declarations[0].id.leadingComments[0].loc).toBe(undefined);
    expect(cloned.declarations[0].id.innerComments[0].loc).toBe(undefined);
    expect(cloned.declarations[0].id.trailingComments[0].loc).toBe(undefined);
  });

  it("should generate same code after deep cloning", function () {
    let code = `//test1
    /*test2*/var/*test3*/ a = 1/*test4*/;//test5
    //test6
    var b;
    `;
    code = generate(parse(code), { retainLines: true }).code;

    const ast = t.cloneNode(
      parse(code),
      /* deep */ true,
      /* withoutLoc */ false,
    );
    const newCode = generate(ast, { retainLines: true }).code;

    expect(newCode).toBe(code);
  });
  describe("token-enabled Files", () => {
    const sources = ["/*block*/0+0;", "0+//line\n0;", "0+0;/*tail*/"];
    it.each(sources)("deep clones comment tokens: %s", source => {
      const file = parse(source, { tokens: true });
      const cloned = t.cloneNode(file);
      expect(cloned.tokens).not.toBe(file.tokens);
      const comment = file.comments[0];
      const index = file.tokens.indexOf(comment);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(cloned.tokens[index]).toBe(cloned.comments[0]);
      expect(cloned.tokens[index]).not.toBe(comment);
      expect(cloned.tokens[index].value).toBe(comment.value);
      expect(cloned.tokens[index].loc).toBe(comment.loc);
      cloned.tokens[index].value = "mutated";
      expect(comment.value).not.toBe("mutated");
      for (const token of file.tokens.filter(
        token => typeof token.type !== "string",
      )) {
        expect(cloned.tokens[file.tokens.indexOf(token)]).toBe(token);
      }
    });
    it("preserves comment attachment aliases while removing locations", () => {
      const file = parse("/*block*/0+0;", { tokens: true });
      const comment = file.comments[0];
      // Explicit shared comment exercises token/File/attachment cache identity.
      file.program.body[0].leadingComments = [comment];
      const clone = t.cloneNode(file, true, true);
      const index = file.tokens.indexOf(comment);
      expect(clone.tokens[index]).toBe(clone.comments[0]);
      expect(clone.program.body[0].leadingComments[0]).toBe(clone.comments[0]);
      expect(clone.comments[0].loc).toBeUndefined();
      expect(clone.loc).toBeNull();
      expect(clone.program.loc).toBeNull();
      expect(comment.loc).toBeDefined();
    });
    it("retains shallow token/comment children with root-only loc removal", () => {
      const file = parse("//line\n0+0;", { tokens: true });
      const clone = t.cloneNode(file, false, true);
      expect(clone.tokens).toBe(file.tokens);
      expect(clone.comments).toBe(file.comments);
      expect(clone.program).toBe(file.program);
      expect(clone.loc).toBeNull();
      expect(clone.program.loc).toBe(file.program.loc);
      expect(clone.comments[0].loc).toBeDefined();
    });
    it("retains generic AST token compatibility and opaque null tokens", () => {
      const file = t.file(t.program([]), [], [t.identifier("token"), null]);
      const clone = t.cloneNode(file);
      expect(clone.tokens[0]).not.toBe(file.tokens[0]);
      expect(clone.tokens[0].name).toBe("token");
      expect(clone.tokens[1]).toBeNull();
    });
  });
});
