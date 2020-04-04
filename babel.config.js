module.export = function (api) {
    // 缓存babel的配置
    api.cache(true); // 等同于api.cache.forever()
    return {
        presets: [
            ['@babel/preset-env', {module: false}]
        ],
        plugins: ['@babel/plugin-syntax-dynamic-import']
    };
};