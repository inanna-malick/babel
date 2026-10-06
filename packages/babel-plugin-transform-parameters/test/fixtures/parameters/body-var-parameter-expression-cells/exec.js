"use strict";
function defaults(a = 1, b = () => a, c = b()) {
  var a;
  a = 2;
  return [a, b(), c];
}
expect(defaults()).toEqual([2, 1, 1]);
function initialized(a = 1, b = () => a) {
  var a = 2;
  return [a, b()];
}
expect(initialized()).toEqual([2, 1]);
function sameCell(a = 1, b = () => a) {
  a = 2;
  return [a, b()];
}
expect(sameCell()).toEqual([2, 2]);
function nested(a, { b = () => a } = {}) {
  var a;
  a = 2;
  return [a, b()];
}
expect(nested(1)).toEqual([2, 1]);
let capture;
function computed(a, { [(capture = () => a, "key")]: b }) {
  var a;
  a = 2;
  return [a, capture(), b];
}
expect(computed(1, {key: 3})).toEqual([2, 1, 3]);
function rest(a, ...[b = () => a]) {
  var a;
  a = 2;
  return [a, b()];
}
expect(rest(1)).toEqual([2, 1]);
function context(a, ...[b = () => [a, this.tag, arguments[0]]]) {
  var a;
  a = 2;
  return [a, b(), this.tag, arguments[0]];
}
expect(context.call({tag: "receiver"}, 1)).toEqual([2, [1, "receiver", 1], "receiver", 1]);
function* generator(a = 1, b = () => a) {
  var a;
  a = 2;
  yield b();
  return a;
}
const g = generator();
expect(g.next()).toEqual({value: 1, done: false});
expect(g.next()).toEqual({value: 2, done: true});
function* restGenerator(a, ...[b = () => a]) {
  var a;
  a = 2;
  yield b();
  return a;
}
const r = restGenerator(1);
expect(r.next()).toEqual({value: 1, done: false});
expect(r.next()).toEqual({value: 2, done: true});

function earlierDefault(a = () => rest, ...[rest]) {
  var rest;
  rest = 2;
  return a();
}
expect(earlierDefault(undefined, 1)).toBe(1);

function bothDefaults(a = 1, b = () => a, ...[c = () => a]) {
  var a;
  a = 2;
  return [a, b(), c()];
}
expect(bothDefaults()).toEqual([2, 1, 1]);
function plainRest(a, ...rest) {
  var a;
  a = 2;
  return [a, rest];
}
expect(plainRest(1, 3)).toEqual([2, [3]]);
function plainPattern({a}) {
  var a;
  a = 2;
  return a;
}
expect(plainPattern({a: 1})).toBe(2);

return (async () => {
  async function timing(a, ...[b = () => a]) {
    var a;
    return b();
  }
  const order = [];
  const done = timing(1).then(() => order.push("f"));
  await Promise.resolve().then(() => order.push("marker"));
  await done;
  expect(order).toEqual(["f", "marker"]);
  async function earlierThrow(a = (() => { throw new Error("earlier default"); })(), ...[b = () => a]) {
    var a;
    a = 2;
  }
  let earlierPromise;
  expect(() => { earlierPromise = earlierThrow(); }).not.toThrow();
  await expect(earlierPromise).rejects.toThrow("earlier default");
  async function asyncRest(a, ...[b = () => a]) {
    var a;
    a = await 2;
    return [a, b()];
  }
  expect(await asyncRest(1)).toEqual([2, 1]);
  async function throwsInRest(a, ...[b = (() => { throw new Error("rest default"); })()]) {
    var a;
    a = 2;
  }
  let promise;
  expect(() => { promise = throwsInRest(1); }).not.toThrow();
  await expect(promise).rejects.toThrow("rest default");
  async function* asyncRestGenerator(a, ...[b = () => a]) {
    var a;
    a = 2;
    yield await b();
    return a;
  }
  const ag = asyncRestGenerator(1);
  expect(await ag.next()).toEqual({value: 1, done: false});
  expect(await ag.next()).toEqual({value: 2, done: true});
})();
