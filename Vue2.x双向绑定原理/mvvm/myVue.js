
function MyVue (options) {
    var _this = this;
    this.vm = this;
    this.data = options.data;

    Object.keys(this.data).forEach(function(key) {
        _this.proxyKeys(key);
    });

    Observe(this.data);
    new Compile(options.el, this.vm);
    return this;
}
MyVue.prototype = {
    constructor: MyVue,
    proxyKeys: function (key) {
        const _this = this;
        Object.defineProperty(this, key, {
            enumerable: false,
            configurable: true,
            get: function proxyGetter() {
                return _this.data[key];
            },
            set: function proxySetter(newVal) {
                _this.data[key] = newVal;
            }
        });
    }
}
