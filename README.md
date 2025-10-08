[![npm][npm-image]][npm-url]
[![NPM downloads][npm-downloads-image]][npm-url]
[![standard][standard-image]][standard-url]

[npm-image]: https://img.shields.io/npm/v/as-model.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/as-model
[standard-image]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square
[standard-url]: http://npm.im/standard
[npm-downloads-image]: https://img.shields.io/npm/dm/as-model.svg?style=flat-square


# as-model

This is a simple state management library with model coding style for javascript/typescript.

## Code first

Create a model function:

```js
// model.js
// A parameter for model state.
export function counting(state){
    // Define instance object for outside usage.
    return {
        // Define properties for instance.
        count: state,
        symbol: !state? '': (state > 0? '+' : '-'),
        // Create action methods for changing state.
        increase:()=> state + 1,
        decrease:()=> state - 1,
        add(...additions){
            return additions.reduce((result, current)=>{
                return result + current;
            }, state);
        }
    };
}
```

Create store:

```js
// store.js
import {counting} from './model';
import {createStore} from 'as-model';

// Create and initialize a model store.
const store = createStore(counting, 0); 
// Get instance and call action methods to change state.
store.getInstance().increase();
// Get new properties from instance.
console.log(store.getInstance().count); // 1
store.getInstance().add(2,3);
console.log(store.getInstance().count); // 6
```

Create multiple stores:

```js
import {counting} from './model';
import {createKey, createStores} from 'as-model';

// Create model key with initial state.
const countingKey0 = createKey(counting, 0);
const countingKey1 = createKey(counting, 1); 

// Use model keys as templates to create multiple stores.
const stores = createStores(countingKey0, countingKey1);
// Find store by model key
const store0 = stores.find(countingKey0);
store0?.getInstance().increase();
console.log(store0?.getInstance().count); // 1
```

Model key is a template for creating multiple stores, and it is also an identifier to find the right store from multiple stores.

Use **model** API to create store or key.

```js
import {counting} from './model';
import {model} from 'as-model';

const store = model(counting).createStore(0);
const key = model(counting).createKey(0);
......
```

In typescript develop environment, `model` API can do a type check for making sure every model action method returns a correct type.

```js
// ts
import {model} from 'as-model';

// The model api ensures every action method returns a same type value with model state.
const counting = model((state: number)=>{
    return {
        count: state,
        increase:()=>state + 1 + '', // type error, should be number, but returns string.
        decrease:()=>state - 1,
        add(...additions: number[]){
            return additions.reduce((result, current)=>{
                return result + current;
            }, state);
        }
    };
});

const store = counting.createStore(0);
const key = counting.createKey(0);
......
```

Subscribe store

```js
import {counting} from './model';
import {model} from 'as-model';

const store = model(counting).createStore(0);
const {getInstance} = store;
// Subscribe the state changes.
const unsubscribe = store.subscribe((action)=>{
    console.log(store.getInstance());
});
getInstance().increase(); // output: {count: 1}
// Destroy subscription.
unsubscribe();
```

Want to use async operations?

```js
import {counting} from './model';
import {model, createSelector} from 'as-model';

const store = model(counting).select((getInstance)=>{
    const instance = getInstance();
    return {
        ...instance,
        async delayIncrease(){
            const ok = await new Promise((resolve)=>{
                setTimeout(()=>{
                    resolve(true);
                },200);
            });
            if(ok){
                getInstance().increase();
            }
        }
    }
}).createStore(0);

const {subscribe, select} = createSelector(store);
const unsubscribe = subscribe();
// When use select with no parameter,
// select method finds default selector for reproducing result 
const {delayIncrease} = select();
await delayIncrease();
select().count // 1
```

Subscribe store in react hooks:

```js
import {model, createStores} from 'as-model';
import {
    createContext, 
    useRef, 
    useState, 
    useEffect, 
    useContext
} from 'react';

// Local state management
function useModel(modelFn, defaultState){
    // Use ref to persist the store object.
    const storeRef = useRef(model(modelFn).createStore(defaultState));
    const store = storeRef.current;
    // Set store instance as an initial state for useState.
    const [state, setState] = useState(store.getInstance());

    useEffect(()=>{
        // Subscribe the state changes.
        const unsubscribe = store.subscribe((action)=>{
            setState(store.getInstance());
        });
        // Destroy subscription when component unmounts.
        return unsubscribe;
    }, []);

    return state;
}

function App(){
    const {
        count, 
        increase
    } = useModel(counting, 0);
}

// global static state management
function useModelStore(store){
    const [state, setState] = useState(store.getInstance());

    useEffect(()=>{
        const unsubscribe = store.subscribe((action)=>{
            setState(store.getInstance());
        });
        return unsubscribe;
    }, []);

    return state;
}

const store = model(counting).createStore({state: 0});

function App(){
    const {
        count, 
        increase
    } = useModelStore(store);
}

// global dynamic state management
const ModelContext = createContext(null);

function create(...keys){
    return {
        provide(Component){
            return function Provider(props){
                // Create and persist multiple stores in Component, that makes different elements from this Component carry different stores.
                const storesRef = useRef(createStores(...keys));
                const stores = storesRef.current;
                // Use Context to provide multiple stores to all the children.
                return (
                    <ModelContext.Provider value={stores}>
                        <Component {...props} />
                    </ModelContext.Provider>
                );
            }
        }
    }
}

function useModelKey(key){
    const stores = useContext(ModelContext);
    if(stores==null){
        throw new Error('ModelContext is not provided');
    }
    // Use model key to find the right store.
    const store = stores.find(key);
    if(store==null){
        throw new Error('Can not find store by model key');
    }
    const [state, setState] = useState(store.getInstance());

    useEffect(()=>{
        const unsubscribe = store.subscribe((action)=>{
            setState(store.getInstance());
        });
        return unsubscribe;
    }, []);

    return state;
}

const countingKey = model(counting).createKey(0);

const App = create(countingKey).provide(function App(){
    const {
        count, 
        increase
    } = useModelKey(countingKey);  
});
```

## Install

```
npm install as-model
```

## Simplify API

### createStore

```js
function createStore(modelFnOrKey, initialState?):store
```

#### parameters

* modelFnOrKey - a model function accepts a state parameter and returns an object with action methods, or a model key of model function.
* initialState - the initial state of the model.

#### return

A store object with model key and methods. The store object has `getInstance` method to get the instance of the model; `subscribe` method to subscribe the state changes; `update` method to update the store with new model function and initial state; `destroy` method to destroy the store.

**store** structure:

```js
{
    getInstance: ()=>instance,
    subscribe: (listener)=>unsubscribe,
    key: modelKey,
    destroy: ()=>void,
    update: (
        data:{
            model?:modelFn, 
            key?: modelKey,
            initialState?: any
            state?: any;
        }
    )=>void,
}
```

### createKey

```js
function createKey(modelFn, initialState?):key
```

#### parameters

* modelFn - a model function accepts a state parameter and returns an object with action methods.
* initialState - the initial state of the model.

#### return

A model key function with `createStore` method to create a store with the model key.

**key** structure:

```js
{
    createStore: (initialState?)=>Store
}
```

### createStores

```js
function createStores(...keys):StoreCollection
```

#### parameters

* keys - multiple model keys of model functions.

#### return

StoreCollection created by the model keys.

**StoreCollection** structure:

```js
{
    find: (key)=>store,
    destroy: ()=>void
}
```

### createSignal

```js
function createSignal(store):SignalStore
```

#### parameters

* store - a store object created by `createStore` method.

#### return

Signal store object with `subscribe` method to subscribe the state changes, and `getSignal` method to get the Signal callback function.

**SignalStore** structure:

```js
{
    subscribe: (listener)=>unsubscribe,
    getSignal: ()=>Signal,
    key: modelKey,
}
```

The Signal function returns a real time instance from store. Only when the properties picked from real time instance are changed, the subscribed listener can receive an action notification.

```js
// Signal
function signal():instance;
// to start statistic the picked properties change
signal.startStatistics():void;
// to end statistic the picked properties change
signal.stopStatistics():void;
```

### createSelector

```js
function createSelector(store, opts?:SelectorOptions):SelectorStore
```

#### parameters

* store - a store object created by `createStore` method.
* opts - (Optional) an object config to optimize createSelector.
  
 ```js
 // opts
  {
    // When the selector is drived to reproduce a new data,
    // it compares if the result is different with the previous one,
    // if the camparing result is true, it represents no differ happens,
    // the subscribed callback will not be called.  
    equality?: (current: T, next: T) => boolean;
  }
 ```

 #### return

 Selector store object with `subscribe` method to subscribe the state changes, and `select` method for reselecting instance.

 ```js
 {
    subscribe: (listener)=>unsubscribe,
    select: (selector?:(getInstance:()=>Instance)=>)=>any,
    key: modelKey,
 }
 ```


### model

```js
function model(modelFn):ModelUsage
```

#### parameters

* modelFn - a model function accepts a state parameter and returns an object with action methods.

#### return

ModelUsage object with `createStore`, `createKey` methods to create store, key for the model function, and `select` method to set a default selector function (Use `createSelector(store).select()` to select the default one). 

**ModelUsage** structure:

```js
{
    createStore: (initialState?)=> store,
    createKey: (initialState?)=> key,
    select: (
      selector:(getInstance:()=>Instance)=>Record<string, any>|Array<any>
    )=>ModelUsage 
}
```

### config

```js
function config(options):configAPI
```

#### parameters

##### options - (Optional) an object with the following properties:
* notify - (Optional) a callback function for noticing an action to every subscriber, it accepts a notifier function and an action as parameters.
* controlled - (Optional) a boolean state to tell as-model use controlled mode to output instance changes.
* middleWares - (Optional) a middleWare array for reproducing state or ignore actions.

#### return

All apis above except `createSignal` and `createSelector` API.

```js
{
    createStore: (modelFnOrKey, initialState?)=>store,
    createKey: (modelFn, initialState?)=>key,
    createStores: (...keys)=>stores,
    model: (modelFn)=>ModelUsage
}
```

### validations

A validate callback collection object.

#### validations.isInstanceFromNoStateModel

```js
function isInstanceFromNoStateModel(instance: any): boolean
```

To validate if the parameter object is a uninitialized store instance.

#### validations.isModelKey

```js
function isModelKey<
    S,
    T extends ModelInstance,
    R extends (ins: () => T) => any = (ins: () => T) => T
  >(
    data: any
  ): data is ModelKey<S, T, R>;
```

To validate if the parameter object is a model key.

#### validations.isModelStore

```js
function isModelStore<
    S,
    T extends ModelInstance,
    R extends (ins: () => T) => any = (ins: () => T) => T
  >(
    data: any
  ): data is Store<S, T, R>;
```

To validate if the parameter object is a store.

#### validations.isModelUsage

```js
function isModelUsage<
    S,
    T extends ModelInstance,
    R extends (ins: () => T) => any = (ins: () => T) => T
  >(
    data: any
  ): data is ModelUsage<S, T, R>;
```

To validate if the parameter object is a model usage. A model usage is created by API **model**, it is a tool collection provides **createKey**, **createStore**, **select** APIs based on the model.

### shallowEqual

```js
function shallowEqual(prev: any, current: any): boolean
```

To validate if the value of left is shallow equal with the value of right.

## Browser Support 

```
chrome: '>=91',
edge: '>=91',
firefox: '=>90',
safari: '>=15'
```

