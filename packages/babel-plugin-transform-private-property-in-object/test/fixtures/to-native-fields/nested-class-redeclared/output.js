var _fooBrandCheck2 = /*#__PURE__*/new WeakSet();
class Foo {
  #foo = (_temp2 => (_temp2 = 1, _fooBrandCheck2.add(this), _temp2))();
  test() {
    var _fooBrandCheck = /*#__PURE__*/new WeakSet();
    class Nested {
      #foo = (_temp => (_temp = 2, _fooBrandCheck.add(this), _temp))();
      test() {
        _fooBrandCheck.has(babelHelpers.checkInRHS(this));
      }
    }
    _fooBrandCheck2.has(babelHelpers.checkInRHS(this));
  }
}
