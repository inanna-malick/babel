var _xBrandCheck = /*#__PURE__*/new WeakSet();
var _yBrandCheck = /*#__PURE__*/new WeakSet();
class F {
  static m() {
    _xBrandCheck.has(babelHelpers.checkInRHS(this));
    _yBrandCheck.has(babelHelpers.checkInRHS(this));
    F === babelHelpers.checkInRHS(this);
  }
  static #x = (_temp => (_temp = 0, _xBrandCheck.add(this), _temp))();
  static #y = (_temp2 => (_temp2 = (() => {
    throw 'error';
  })(), _yBrandCheck.add(this), _temp2))();
  static #z() {}
}
