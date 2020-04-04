(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = global || self, factory(global.singleSpa = {}));
}(this, (function (exports) { 'use strict';

    const NOT_LOADED = 'NOT_LOADED';
    const SKIP_BECAUSE_BROKEN = 'SKIP_BECAUSE_BROKEN';
    const LOAD_ERROR = 'LOAD_ERROR';
    const LOAD_SOURCE_CODE = 'LOAD_SOURCE_CODE'; // import { NOT_LOADED, notLoadError, notSkip, isntLoaded, shouldBeActivity } from './appsHelper';

    function notSkip(app) {
      return app.status !== SKIP_BECAUSE_BROKEN;
    }
    function notLoadError(app) {
      return app.status !== LOAD_ERROR;
    }
    function isntLoaded(app) {
      return app.status === NOT_LOADED;
    }
    function shouldBeActivity(app) {
      try {
        return app.activityWhen(window.location);
      } catch (e) {
        app.status = SKIP_BECAUSE_BROKEN;
        console.log(e);
      }
    }

    function start() {}

    function smelLikeAPromise(promise) {
      if (promise instanceof Promise) {
        return true;
      }

      return typeof promise === 'object' && typeof promise.then === 'function' && typeof promise.catch === 'function';
    }

    function toLoadPromise(app) {
      if (app.status !== NOT_LOADED) {
        return Promise.resolve(app);
      }

      app.status = LOAD_SOURCE_CODE;
      let loadPromise = app.loadFunction();

      if (!smelLikeAPromise(loadPromise)) {
        return Promise.reject(new Error('加载函数不是一个promise'));
      }
    }

    let appChangesUnderway = false;
    function invoke() {
      // 现检查appChanges有没有在做事件循环
      if (appChangesUnderway) {
        return new Promise((resolve, reject) => {
        });
      }

      appChangesUnderway = true; // 判断应用是否启动

      {
        // 如果应用没有启动， 那么启动应用
        loadApps();
      }

      function loadApps() {
        // 获取需要被加载的app
        let apps = getAppsToLoad();
        apps.map(toLoadPromise);
      }
    }

    /**
     * @function 注册App
     * @param {string} appName 要注册的app的名称
     * @param {Function: Promise | Object} loadFunction app异步加载函数， 或者app的内容
     * @param {Function: boolean} activityWhen  判断该app应该何时启动
     * @param {Object} customProps  自定义参数配置
     * return Promise
     */

    const APPS = [];
    function registerApplication(appName, loadFunction, activityWhen, customProps) {
      // 判断参数是否合法
      if (!appName || typeof appName !== 'string') {
        throw new Error('appName不可以是一个空字符串');
      }

      if (!loadFunction) {
        throw new Error('loadFunction must be a function or object');
      }

      if (typeof loadFunction !== 'function') {
        loadFunction = () => Promise.resolve(loadFunction);
      }

      if (typeof activityWhen !== 'function') {
        throw new Error('activityWhen must be a function');
      }

      APPS.push({
        name: appName,
        loadFunction,
        activityWhen,
        customProps,
        status: NOT_LOADED
      });
      invoke();
    }
    /**
     * @function 获取需要被加载的app
     */

    function getAppsToLoad() {
      return APPS.filter(notSkip).filter(notLoadError).filter(isntLoaded).filter(shouldBeActivity);
    }

    exports.registerApplication = registerApplication;
    exports.start = start;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=single-spa-bundle.js.map
