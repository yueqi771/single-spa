import { isStarted } from '../start'
import { getAppsToLoad, getAppsTomount, getAppsToUnmount } from '../application/app'
import { toLoadPromise } from '../lifecycles/load'
import { toMountPromise } from '../lifecycles/mount';
import { toUnmountPromise } from '../lifecycles/unmount';
import { toBootstrapPromise } from '../lifecycles/bootstrap';
import { getMountedApps } from '../application/app'
import { callCaptureEvents } from './hijackLoactions';

let appChangesUnderway = false;
let changesQueue = [];

export function invoke(pendings = [], eventArgs) {
    // 现检查appChanges有没有在做事件循环
    if(appChangesUnderway) {
        return new Promise((resolve, reject) => {
            changesQueue.push({
                success: resolve,
                failure: reject,
                eventArgs
            })
        })
    }

    appChangesUnderway = true

    // 判断应用是否启动
    if(isStarted()) {
        return performAppChanges()
    }

    // 如果应用没有启动， 那么启动应用
    return loadApps();

    function loadApps() {
        // 获取需要被加载的app
        return Promise.all(getAppsToLoad().map(toLoadPromise)).then((apps) => {
            callAllCaptureEvents()
            return finish();
        }).catch(e => {
            console.log(e)
            callAllCaptureEvents()
        })
    }

    /**
     * @function 如果应用已经启动，那么卸载不需要的app，加载需要的app，挂载需要的app
     */
    function performAppChanges() {
        // 先卸载不需要的app
        let unmountPromise = getAppsToUnmount().map(toUnmountPromise);
        unmountPromise = Promise.all(unmountPromise);
        console.log('unmountPromise:', getAppsToUnmount())

        // will load app --> NOT_MOUNTED
        let loadApps = getAppsToLoad()
        loadApps = loadApps.map(app => {
            // 先去加载， 加载完成之后调用bootstrap, 然后卸载，然后加载
            return toLoadPromise(app).then((app) => {
                return toBootstrapPromise(app)
                    .then(() => unmountPromise)
                    .then(() =>  toMountPromise(app))
            })
        });

        // will mount app --> NOT_MOUNTED
        let mountApps = getAppsTomount();

        // 针对load和mount的app做去重
        mountApps = mountApps.filter(app => loadApps.indexOf(app) === -1) 

        mountApps = mountApps.map((app) => {
            return toBootstrapPromise(app)
                .then(() => unmountPromise)
                .then(() => toMountPromise(app))
        })

        // 卸载没有问题的时候， 进行挂载新的
        return unmountPromise.then(() => {
            let allPromises = loadApps.concat(mountApps);
            
            return Promise.all(allPromises.map(toMountPromise)).then(() => {
                callAllCaptureEvents()
                return finish();
            }, e => {
                // 当一个promise状态已经改变的时候， 再次调用的时候不会在改变
                pendings.forEach(item => item.failure(e));
                throw e
            })
        }, e => {
            callAllCaptureEvents()
            console.log(e)
        })
    }

    function finish() {
        // 路由改变， 或者是调用start方法
        // /home, 正在加载appA的时候， route变为了/index
        // appA加载完成之后， 必须立马加载appB， 将appB放到changesQueue里面，
        let returnValue = getMountedApps();
        if(pendings.length) {
            pendings.forEach(item => item.success(returnValue))
        }

        // 当前的循环已经完成
        appChangesUnderway = false;
        if(changesQueue.length) {
            // backup就是当前循环中被推到事件队列里的事件， 这些事件交给下一次的invoke处理
            let backup = changesQueue;
            changesQueue = [];

            invoke(backup);
        }
        
        return returnValue
    }


    function callAllCaptureEvents() {
        // 如果eventsQueue.length > 0  说明： 路由发生了改变
        pendings && pendings.length &&
        (
            pendings.filter(item => {
                // 判断是否有事件参数， 如果有的话， 说明路由发生了改变
                return !!item.eventArgs
            }).forEach(event => {
                callCaptureEvents(event)
            })
        )


        eventArgs && callCaptureEvents(eventArgs)
    }
}