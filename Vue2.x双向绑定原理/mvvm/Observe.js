
 function Observe (obj) {
    if (!obj || typeof obj !== 'object') {throw TypeError("")}
    const keyArr = Object.keys(obj)
    keyArr.forEach(key => {
        defineReactive(obj, key, obj[key])
    })
    return obj
}

function defineReactive(obj, key, val) {
    const dep = new Dep()
    Object.defineProperty(obj, key, {
        get() {
            dep.addSubs()
            return val
        },
        set(newVal) {
            if (newVal === val) {
                return
            }
            val = newVal
            dep.notify()
        }
    })
}
