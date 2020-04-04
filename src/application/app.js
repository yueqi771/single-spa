import { NOT_LOADED, notLoadError, notSkip, isntLoaded, shouldBeActivity } from './appsHelper';
import { invoke } from '../navigations/invoke';

/**
 * @function 注册App
 * @param {string} appName 要注册的app的名称
 * @param {Function: Promise | Object} loadFunction app异步加载函数， 或者app的内容
 * @param {Function: boolean} activityWhen  判断该app应该何时启动
 * @param {Object} customProps  自定义参数配置
 * return Promise
 */
const APPS = []
export function registerApplication(appName, loadFunction, activityWhen, customProps) {
    // 判断参数是否合法
    if(!appName || typeof appName !== 'string') {
        throw new Error('appName不可以是一个空字符串')
    }
    if(!loadFunction) {
        throw new Error('loadFunction must be a function or object')
    }
    if(typeof loadFunction !== 'function') {
        loadFunction = () => Promise.resolve(loadFunction)
    }
    if(typeof activityWhen !== 'function') {
        throw new Error('activityWhen must be a function')
    }

    APPS.push({
        name: appName,
        loadFunction,
        activityWhen,
        customProps,
        status: NOT_LOADED
    })

    invoke();
}

/**
 * @function 获取需要被加载的app
 */
export function getAppsToLoad() {
    return APPS.filter(notSkip).filter(notLoadError).filter(isntLoaded).filter(shouldBeActivity)
}

