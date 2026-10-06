// Numeric conversion must occur once, before bounds checks and indexing.
for (const offset of [0, 1]) {
  let calls = 0;
  const index = { valueOf() { return calls++; } };
  const take = offset
    ? function (head, ...args) { return args[+index]; }
    : function (...args) { return args[+index]; };
  expect(offset ? take("head", 11, 22, 33) : take(11, 22, 33)).toBe(11);
  expect(calls).toBe(1);
}

for (const offset of [0, 1]) {
  const log = [];
  const error = new Error("index conversion");
  const index = { valueOf() { log.push("coerce"); throw error; } };
  const take = offset
    ? function (head, ...args) { return args[+index]; }
    : function (...args) { return args[+index]; };
  expect(() => offset ? take("head", 11) : take(11)).toThrow(error);
  expect(log).toEqual(["coerce"]);
}

let calls = 0;
const index = { valueOf() { if (++calls > 1) throw new Error("repeated conversion"); return 0; } };
function take(...args) { return args[+index]; }
expect(take(11)).toBe(11);
expect(calls).toBe(1);
