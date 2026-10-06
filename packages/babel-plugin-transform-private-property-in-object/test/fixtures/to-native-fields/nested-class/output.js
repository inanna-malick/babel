var _fooBrandCheck = /*#__PURE__*/new WeakSet();
class Foo {
  #foo = (_temp => (_temp = 1, _fooBrandCheck.add(this), _temp))();
  test() {
    class Nested {
      test() {
        _fooBrandCheck.has(babelHelpers.checkInRHS(this));
      }
    }
    _fooBrandCheck.has(babelHelpers.checkInRHS(this));
  }
}
