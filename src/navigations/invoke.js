import { isStarted } from '../start'
import { getAppsToLoad } from '../application/app'
import { toLoadPromise } from '../lifecycles/load'

let appChangesUnderway = false;
let changesQueue = [];

export function invoke() {
    // 现检查appChanges有没有在做事件循环
    if(appChangesUnderway) {
        return new Promise((resolve, reject) => {
            changesQueue.push({
                success: resolve,
                failure: reject
            })
        })
    }

    appChangesUnderway = true

    // 判断应用是否启动
    if(isStarted()) {

    }else {
        // 如果应用没有启动， 那么启动应用
        loadApps()
    }

    function loadApps() {
        // 获取需要被加载的app
        let apps = getAppsToLoad()
        
        apps.map(toLoadPromise)
    }
}