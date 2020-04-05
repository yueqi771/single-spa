export function smelLikeAPromise(promise) {
    if(promise instanceof Promise) {
        return true 
    }

    return typeof promise === 'object' && typeof promise.then === 'function' && typeof promise.catch === 'function'
}

/**
 * 
 * @param {*} lifecycles 
 * @param {*} description 
 */
export function flattenLifecyclesArray(lifecycles, description) {
    if(!Array.isArray(lifecycles)) {
        lifecycles = [lifecycles]
    }

    if(!lifecycles.length) {
        lifecycles = [() => Promise.resolve()]
    }

    return props => new Promise((resolve, reject) => {
        waitForPromises(0)
        
        function waitForPromises(index) {
            let fn = lifecycles[index](props);

            if(!smelLikeAPromise(fn)) {
                reject(new Error(`${description} has error`))
            }else {
                fn.then(() => {
                    if(index >= lifecycles.length - 1) {
                        resolve()
                    }else {
                        waitForPromises(++index)
                    }
                }).catch(reject)
            }
        }
    })
}

/**
 * 
 */
export function getProps(app) {
    return {
        name: app.name,
        ...app.customProps
    }
}

