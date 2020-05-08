function Dep() {
    this.subs = []
}
Dep.prototype = {
    constructor: Dep,
    addSubs () {
        if (Dep.target !== null) {
            this.subs.push(Dep.target)
        }
    },
    notify () {
        this.subs.forEach(x => x.update())
    }
}
Dep.target = null
