## Vue自定义事件绑定，事件触发

众所周知，在vue中你如果想调用原生事件，则在事件后面加一个.native修饰符，vue就可以帮你去调用原生的addEventListener。

那么Vue它自己的自定义事件是如何实现的呢？

我们知道Vue中 $on可以绑定自定义事件，除了它，还有$emit,$off,$once是与之相关的api，他们分别的作用是:

- $on 绑定自定义事件
- $emit 触发自定义事件
- off 事件解绑
- once 触发一次自动解绑

我们去Vue项目中看看，它是如何实现的

传送门: [https://github.com/vuejs/vue/blob/dev/src/core/instance/events.js](https://github.com/vuejs/vue/blob/dev/src/core/instance/events.js)

## $on
```
 const hookRE = /^hook:/
 Vue.prototype.$on = function (event: string | Array<string>, fn: Function): Component {
    const vm: Component = this
    if (Array.isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        vm.$on(event[i], fn)
      }
    } else {
      (vm._events[event] || (vm._events[event] = [])).push(fn)
      // optimize hook:event cost by using a boolean flag marked at registration
      // instead of a hash lookup
      if (hookRE.test(event)) {
        vm._hasHookEvent = true
      }
    }
    return vm
  }
```
这里有一定基础的同学应该一眼就可以看出它的逻辑，只是可能对_hasHookEvent这个东西是干嘛的有一些疑问，

我们先来介绍一下HookEvent这个概念：

首先Vue中各个声明周期，其实就是一种hook,比如Vue中 create, mounted这些都是hook,你可以往里面写各种自定义内容的回调函数，

在Vue中，hook可以作为一种事件,在这里就称之为HookEvent.

为了弄清这个概念，我们可以先看看Vue中声明周期的部分代码：

```
vm._self = vm
initLifecycle(vm)
initEvents(vm)
initRender(vm)
callHook(vm, 'beforeCreate')
initInjections(vm) // resolve injections before data/props
initState(vm)
initProvide(vm) // resolve provide after data/props
callHook(vm, 'created')
```
我们可以看到，他开始会做一些初始化的操作，这里不用关心各个函数初始化内细节，我们只需知道，它在每个生命周期准备完成之后会调用callHook这个函数，这个callHook是干嘛的，我们来看一下:
```
export function callHook (vm: Component, hook: string) {
  // #7573 disable dep collection when invoking lifecycle hooks
  pushTarget()
  const handlers = vm.$options[hook]
  const info = `${hook} hook`
  if (handlers) {
    for (let i = 0, j = handlers.length; i < j; i++) {
      invokeWithErrorHandling(handlers[i], vm, null, vm, info)
    }
  }
  
  // vm._hasHookEvent为true,才可以触发$emit
  if (vm._hasHookEvent) {
    vm.$emit('hook:' + hook)
  }
  popTarget()
}
```
这里主要注意的是，只有_hasHookEvent为true，那么我就可以执行这个hook函数，比如，callHook(vm, 'created')，就会自动执行created里面所有的回调。

那回过头来看刚才$on里面的代码那行代码:
```
const hookRE = /^hook:/
Vue.prototype.$on = function (event: string | Array<string>, fn: Function): Component {
    .....
      if (hookRE.test(event)) {
        vm._hasHookEvent = true
      }
    .....
  }
```
意思就很明白了，检测到一个以'hook:'开头的，那么vm._hasHookEvent置为true,之后在组件对应的生命周期钩子中执行hook函数，

来一个实际场景方便大家理解，比如我在父组件里给子组件在mounted钩子里注入一个回调函数:
```
<SonComponent @hook:mounted="handleMounted">
```
那么子组件就会在mounted的时候去执行注入的handleMounted函数。


好，这里$on中HookEvent的概念说完了，我们回归到$on中其他的代码中，我这里用js将代码稍微写啰嗦一点，方便新同学理解:
```
Vue.prototype.$on = function (event, fn) {
    const vm = this
    if (Array.isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        vm.$on(event[i], fn)
      }
    } else {
        if (!vm._events[event]) {
            (vm._events[event] = []
        }
        vm._events[event].push(fn)
        
        if (hookRE.test(event)) {
                vm._hasHookEvent = true
        }
    }
    return vm
  }
```
简单来说就是进来先判断是不是数组，如果是的话做一个$on的递归操作，当进来的是单个事件了，
则判断实例中_events里是否有相同event函数名，没有的话就初始化该事件的数组，再将这个事件回调函数push进去，否则直接push.最后判断是否为hookEvent,如果是，则将vm._hasHookEvent = true，为了以后某个生命周期阶段自动触发。

现在我通过$on这个方法就可以再Vue实例上注册方法了，接下来介绍事件的手动触发。

## $emit
先看下整体源码：
```
 Vue.prototype.$emit = function (event: string): Component {
    const vm: Component = this
    if (process.env.NODE_ENV !== 'production') {
    
    // 非生产环境下，event做小写处理
      const lowerCaseEvent = event.toLowerCase()
      
      // 传入事件字符串如果是驼峰值,且已有相应的小写监听事件挂载，则弹出警告
      if (lowerCaseEvent !== event && vm._events[lowerCaseEvent]) {
      
        tip(
          `Event "${lowerCaseEvent}" is emitted in component ` +
          `${formatComponentName(vm)} but the handler is registered for "${event}". ` +
          `Note that HTML attributes are case-insensitive and you cannot use ` +
          `v-on to listen to camelCase events when using in-DOM templates. ` +
          `You should probably use "${hyphenate(event)}" instead of "${event}".`
        )
      }
    }
    let cbs = vm._events[event]
    if (cbs) {
      cbs = cbs.length > 1 ? toArray(cbs) : cbs
      
      // 拿到$emit 除event其他arguments参数，并将这个类数组转化为数组
      const args = toArray(arguments, 1)
      const info = `event handler for "${event}"`
      for (let i = 0, l = cbs.length; i < l; i++) {
        invokeWithErrorHandling(cbs[i], vm, args, vm, info)
      }
    }
    return vm
  }
```
这段代码的逻辑开始的逻辑我已经写到注释里面了，我们把它的警告提示翻译一下:

> event(小写)在当前的实例里面已经被触发了，但是它的处理逻辑却是在event(含大写)中的，需注意HTML属性是大小写不敏感的，你不能在使用in-Dom模板的时候让v-on去监听一个驼峰命名的事件，你应该使用连字号(handleFunc => handle-func )来代替现在的含大写的命名。

ok，主要是来看下面的逻辑：
这里的invokeWithErrorHandling()函数其实就是在当前实例执行上下文中执行cbs[i]，不过它还带有一个完整的异常捕捉机制，在这里你可以理解为带异常捕捉的cb[i].apply(vm, args)

> 有兴趣的同学请点传送门[invokeWithErrorHandling()](https://github.com/vuejs/vue/blob/dev/src/core/util/error.js)

前面的一系列操作逻辑也很简单，需要稍加说明的地方我已经写入了注释，后面不做过多解释。

所以$emit的核心逻辑也十分简单，就是根据事件名称去执行其中的各个回调，我们用js重写一遍
```
 Vue.prototype.$emit = function (event) {
    const vm = this
    let cbs = vm._events[event]
    if (cbs) {
      cbs = cbs.length > 1 ? toArray(cbs) : cbs
      const args = toArray(arguments, 1)
      for (let i = 0, l = cbs.length; i < l; i++) {
         try {
            cbs[i].apply(vm, args)
         } catch (e) {
            handleError(e, vm, `event handler for "${event}"`)
         }
      }
    }
    return vm
  }
```
接下来就是自定义事件的清空回调了，我们会用到$off

## $off
还是先来看源码:
```
Vue.prototype.$off = function (event?: string | Array<string>, fn?: Function): Component {
    const vm: Component = this
    // all
    if (!arguments.length) {
      vm._events = Object.create(null)
      return vm
    }
    // array of events
    if (Array.isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        vm.$off(event[i], fn)
      }
      return vm
    }
    // specific event
    const cbs = vm._events[event]
    if (!cbs) {
      return vm
    }
    if (!fn) {
      vm._events[event] = null
      return vm
    }
    // specific handler
    let cb
    let i = cbs.length
    while (i--) {
      cb = cbs[i]
      if (cb === fn || cb.fn === fn) {
        cbs.splice(i, 1)
        break
      }
    }
    return vm
  }
```
> 这里对没有Flow或者TypeScript经验的小伙伴可能有点迷惑参数中的"?"，"?"指该项是非必传参数。

下面我们根据源码的注释来:
> //all

当你调用了this.$off()，arguments.length === 0，就会进入,它把一个原型对象为null的空对象赋值给了vm._events，相当于清空了该事件所有的回调。

> // array of events    // specific event

如果是事件数组则执行递归操作，直到是一个特定的事件，如果没有注册该事件则什么都不干，返回当前实例，如果存在事件但没有指定是哪个回调函数,则将该事件所有回调函数置空再返回当前实例。

> // specific handler

如果存在该事件，并指定了特定回调函数，则在该事件中遍历找到该回调函数，从这个事件上移除。

## $once
该方法注册后使用一次就注销。
```
 Vue.prototype.$once = function (event: string, fn: Function): Component {
    const vm: Component = this
    function on () {
      vm.$off(event, on)
      fn.apply(vm, arguments)
    }
    on.fn = fn
    vm.$on(event, on)
    return vm
  }
```
该函数一进来会自己写一个方法，然后用vm.$on去注册event事件并挂载fn方法，它自己写的方法里又实现了自动解绑的逻辑，当$emit触发之后，首先在实例中清除他自己生成的on方法，然后在让fn在当前实例下执行。实现使用一次就注销的操作。
