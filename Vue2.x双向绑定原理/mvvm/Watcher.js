
function Watcher(vm, exp, cb) {
    this.vm = vm;
    this.exp = exp;
    this.cb = cb;
    this.value = this.get()
}
Watcher.prototype = {
    constructor: Watcher,
    get() {
        Dep.target = this;
        const value = this.vm.data[this.exp]
        Dep.target = null
        return value
    },
    update() {
        const _this = this
        if (_this.value !== _this.vm.data[this.exp]) {
            _this.cb.call(_this.vm, _this.vm.data[_this.exp])
            _this.value = _this.vm.data[_this.exp]
        }
    }
}
