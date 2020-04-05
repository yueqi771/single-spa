import resolve from 'rollup-plugin-node-resolve';
import commomjs from 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';
import server from 'rollup-plugin-serve';
import commonjs from 'rollup-plugin-commonjs';

export default {
    input: './src/single-spa.js',
    output: {
        file: './lib/umd/single-spa-bundle.js',
        format: 'umd', // umd, commonjs esm AMD CMD systemjs
        name : 'singleSpa',
        sourcemap: true
    },
    plugins: [
        resolve(),
        commonjs(),
        babel({
            exclude: 'node_modules/**'
        }),

        process.env.SERVER ? server({
            open: true, 
            contentBase: '',
            openPage: 'public/index.html',
            port: '3303'
        }) : null
    ]
}