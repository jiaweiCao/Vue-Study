
function Compile(el, vm) {
    this.vm = vm
    this.el = document.querySelector(el)
    this.fragment = null
    this.init()
}
Compile.prototype = {
    constructor: Compile,
    init() {
        if (this.el) {
            this.fragment = this.nodeToFragment(this.el)
            this.compileElement(this.fragment);
            this.el.appendChild(this.fragment);
        }
    },
    nodeToFragment (el) {
        let fragment = document.createDocumentFragment();
        while (el.firstChild) {
            fragment.appendChild(el.firstChild)
        }
        return fragment
    },
    compileElement (el) {
        let childNodes = el.childNodes
        const self = this
        Array.prototype.slice.call(childNodes).forEach(node => {
            const reg = /\{\{\s*(.*?)\s*\}\}/;
            const text = node.textContent
            if (self.isTextNode(node) && reg.test(text)) {
                self.compileText(node, reg.exec(text)[1])
            }
            if (node.childNodes && node.childNodes.length) {
                self.compileElement(node)
            }
        })
    },
    isTextNode (node) {
        return node.nodeType == 3
    },
    compileText(node, exp) {
        const self = this
        const initText = this.vm[exp]
        this.updateText(node, initText)
        new Watcher(this.vm, exp, function (value) {
            self.updateText(node, value)
        })
    },
    updateText (node, value) {
        node.textContent = typeof value === 'undefined' ? '' : value
    }
}
