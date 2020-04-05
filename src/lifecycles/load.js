import { NOT_LOADED, LOAD_SOURCE_CODE, SKIP_BECAUSE_BROKEN, NOT_BOOTSTRAP, LOAD_ERROR } from "../application/appsHelper";
import { smelLikeAPromise, flattenLifecyclesArray, getProps } from "./helper";
import { ensureTimeout } from '../application/timeout'

export function toLoadPromise(app) {
    if(app.status !== NOT_LOADED) {
        return Promise.resolve(app)
    }

    app.status = LOAD_SOURCE_CODE;
    
    let loadPromise = app.loadFunction(getProps(app))

    if(!smelLikeAPromise(loadPromise)) {
        app.status = SKIP_BECAUSE_BROKEN
        return Promise.reject(new Error('加载函数不是一个promise'));
    } 
    // 开始加载app了
    return loadPromise.then(appConfig => {
        if(typeof appConfig !== 'object') {
            throw new Error('')
        }

        let errors = []
        let lifecycles = ['bootstrap', 'mount', 'unmount']
        lifecycles.forEach(lifecycle => {
            if(!appConfig[lifecycle]) {
                errors.push('lifecycle:' + lifecycle + 'must be exists')
            }
        })

        if(errors.length) {
            app.status = SKIP_BECAUSE_BROKEN;
            console.log(errors);
            return
        }
        
        // 加载成功， 改变状态
        app.status = NOT_BOOTSTRAP;
        app.bootstrap = flattenLifecyclesArray(appConfig.bootstrap, `app: ${app.name} bootstraping`);
        app.mount = flattenLifecyclesArray(appConfig.mount, `app: ${app.name} mounting`);
        app.unmount = flattenLifecyclesArray(appConfig.unmount, `app: ${app.name} unmounting`);

        // 处理超时
        app.timeouts = ensureTimeout(appConfig.timeouts);

        console.log('app加载完了', app)

        return app;

    }).catch(e => {
        app.status = LOAD_ERROR;
        console.log(e)
    })
}