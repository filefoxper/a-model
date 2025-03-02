[![npm][npm-image]][npm-url]
[![NPM downloads][npm-downloads-image]][npm-url]
[![standard][standard-image]][standard-url]

[npm-image]: https://img.shields.io/npm/v/a-model.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/a-model
[standard-image]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square
[standard-url]: http://npm.im/standard
[npm-downloads-image]: https://img.shields.io/npm/dm/a-model.svg?style=flat-square


# a-model

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
import {createStore} from 'a-model';

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
import {createKey, createStores} from 'a-model';

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

Model key is a template for creating multiple stores, and it is also an identifier to find the rightstore from multiple stores.

Use **model** API to create store or key.

```js
import {counting} from './model';
import {model} from 'a-model';

const store = model(counting).createStore(0);
const key = model(counting).createKey(0);
......
```

In typescript develop environment, `model` API can do a type check for making sure the model action method returns a correct type.

```js
// ts
import {model} from 'a-model';

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

Sync store

```js
import {counting} from './model';
import {model} from 'a-model';

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

Sync store with state in react hooks:

```js
import {model, createStores} from 'a-model';
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
    destroy: ()=>void
    update: (
        data:{
            model?:modelFn, 
            initialState?: any
        }
    )=>void
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
    createStore: (initialState?)=>store
}
```

### createStores

```js
function createStores(...keys):stores
```

#### parameters

* keys - multiple model keys of model functions.

#### return

Multiple stores created by the model keys.

**stores** structure:

```js
{
    find: (key)=>store,
    destroy: ()=>void
}
```

### createSignal

```js
function createSignal(store):signalAPI
```

#### parameters

* store - a store object created by `createStore` method.

#### return

Signal api object with `subscribe` method to subscribe the state changes, and `getSignal` method to get the signal callback function.

**signalAPI** structure:

```js
{
    subscribe: (listener)=>unsubscribe,
    getSignal: ()=>signal,
    key: modelKey,
}
```

The signal function returns a real time instance from store. Only when the properties picked from real time instance are changed, the subscribed listener can receive an action notification.

### model

```js
function model(modelFn):modelAPI
```

#### parameters

* modelFn - a model function accepts a state parameter and returns an object with action methods.

#### return

Model api object with `createStore`and `createKey` methods to create store and key for the model function.

**modelAPI** structure:

```js
{
    createStore: (initialState?)=>store,
    createKey: (initialState?)=>key
}
```

### config

```js
function config(options):configAPI
```

#### parameters

* options - an object with the following properties:
  * batchNotify - a callback function to batch notify the listeners, for example: `unstable_batchedUpdates` from react-dom.

#### return

All apis above except `createSignal` API.

```js
{
    createStore: (modelFnOrKey, initialState?)=>store,
    createKey: (modelFn, initialState?)=>key,
    createStores: (...keys)=>stores,
    model: (modelFn)=>modelAPI
}
```

## Browser Support 

```
chrome: '>=91',
edge: '>=91',
firefox: '=>90',
safari: '>=15'
```

